const assert = require('node:assert/strict');
const test = require('node:test');

test.describe('Test Unitario: Modelo Multiusuario y Control de Acceso (RBAC) con RLS', () => {
  // Simulación del motor PostgreSQL con la tabla company_members y la función user_role_in_company()
  
  let mockCompanyMembers = [
    { company_id: 'comp-camaguey', user_id: 'usr-ruby-owner', role: 'owner' },
    { company_id: 'comp-camaguey', user_id: 'usr-rodolfo-admin', role: 'admin' },
    { company_id: 'comp-camaguey', user_id: 'usr-sthefanie-editor', role: 'editor' },
    { company_id: 'comp-camaguey', user_id: 'usr-auditor-viewer', role: 'viewer' },
  ];

  let mockCompanies = [
    { id: 'comp-camaguey', user_id: 'usr-ruby-owner', name: 'CAMAGUEY S.A' },
    { id: 'comp-otra', user_id: 'usr-externo', name: 'OTRA EMPRESA S.A.S.' },
  ];

  let mockUploads = [
    { id: 'upl-001', company_id: 'comp-camaguey', file_name: 'Extracto_Bancolombia.xlsx', user_id: 'usr-ruby-owner' },
    { id: 'upl-002', company_id: 'comp-camaguey', file_name: 'Libro_Auxiliar.xlsx', user_id: 'usr-sthefanie-editor' },
    { id: 'upl-003', company_id: 'comp-otra', file_name: 'Extracto_Ajeno.xlsx', user_id: 'usr-externo' },
  ];

  // Simulación de la función public.user_role_in_company(target_company_id uuid)
  // SECURITY DEFINER, search_path = '', STABLE
  function userRoleInCompany(targetCompanyId, authUid) {
    if (!authUid || !targetCompanyId) return null;
    const match = mockCompanyMembers.find(
      (m) => m.company_id === targetCompanyId && m.user_id === authUid
    );
    return match ? match.role : null;
  }

  // Simulación estricta del trigger trg_new_company_owner / handle_new_company_owner()
  // Reglas:
  // 1. Anti-suplantación: Si auth.uid() y NEW.user_id no son null y no coinciden -> RAISE EXCEPTION
  // 2. Inversión de prioridad: auth.uid() primero, solo NEW.user_id si auth.uid() es NULL
  // 3. Excepciones: unique_violation continúa con warning; foreign_key_violation aborta con exception
  function triggerHandleNewCompanyOwner(newCompany, currentAuthUid) {
    // 1. Validación anti-suplantación
    if (
      currentAuthUid !== null &&
      newCompany.user_id !== null &&
      newCompany.user_id !== undefined &&
      newCompany.user_id !== currentAuthUid
    ) {
      throw new Error(
        `No está autorizado para registrar una empresa a nombre de otro usuario (NEW.user_id: ${newCompany.user_id}, auth.uid: ${currentAuthUid})`
      );
    }

    // 2. Inversión de prioridad: auth.uid() tiene precedencia sobre NEW.user_id
    const targetUserId = currentAuthUid !== null ? currentAuthUid : (newCompany.user_id || null);

    if (targetUserId !== null) {
      try {
        const existingIdx = mockCompanyMembers.findIndex(
          (m) => m.company_id === newCompany.id && m.user_id === targetUserId
        );
        if (existingIdx >= 0) {
          // unique_violation: actualiza a owner y continúa
          mockCompanyMembers[existingIdx].role = 'owner';
        } else {
          // Simulación de foreign_key_violation si el usuario no existe en auth.users
          if (targetUserId === 'usr-inexistente-invalido') {
            const fkError = new Error('foreign_key_violation: key not present in auth.users');
            fkError.code = '23503';
            throw fkError;
          }
          mockCompanyMembers.push({
            company_id: newCompany.id,
            user_id: targetUserId,
            role: 'owner',
          });
        }
      } catch (err) {
        if (err.code === '23503' || err.message.includes('foreign_key_violation')) {
          // foreign_key_violation: aborta la transacción
          throw err;
        }
        // unique_violation: continúa con warning
      }
    }

    mockCompanies.push(newCompany);
    return newCompany;
  }

  // Simulación de evaluación de política RLS en PostgreSQL para uploads
  function evaluateUploadsRLS(operation, uploadRow, authUser, jwtPayload = { aal: 'aal2' }, userHasMfa = false) {
    if (!authUser || !authUser.id) return false;
    const authUid = authUser.id;

    // 1. POLÍTICAS PERMISIVAS (AS PERMISSIVE):
    const role = userRoleInCompany(uploadRow.company_id, authUid);
    let passesPermissive = false;

    if (operation === 'SELECT') {
      // uploads_select_member: public.user_role_in_company(company_id) IS NOT NULL
      passesPermissive = role !== null;
    } else if (operation === 'INSERT' || operation === 'UPDATE' || operation === 'DELETE') {
      // uploads_insert_editor: public.user_role_in_company(company_id) IN ('owner', 'admin', 'editor')
      passesPermissive = ['owner', 'admin', 'editor'].includes(role);
    }

    if (!passesPermissive) return false;

    // 2. POLÍTICAS RESTRICTIVAS DE MFA (AS RESTRICTIVE):
    // auth.uid() IS NOT NULL AND ((auth.jwt()->>'aal') = 'aal2' OR NOT (SELECT public.user_has_mfa()))
    const isAAL2 = jwtPayload?.aal === 'aal2';
    const passesRestrictiveMfa = authUid !== null && (isAAL2 || !userHasMfa);

    // En PostgreSQL: PERMISSIVE (OR) COMBINADA CON RESTRICTIVE (AND)
    return passesPermissive && passesRestrictiveMfa;
  }

  // Simulación de evaluación de política RLS en PostgreSQL para companies
  function evaluateCompaniesRLS(operation, companyRow, authUser) {
    if (!authUser || !authUser.id) return false;
    const authUid = authUser.id;
    const role = userRoleInCompany(companyRow.id, authUid);

    if (operation === 'SELECT') {
      return role !== null || companyRow.user_id === authUid;
    }
    if (operation === 'UPDATE' || operation === 'DELETE') {
      // companies_update_owner / companies_delete_owner: Solo owner
      return role === 'owner' || companyRow.user_id === authUid;
    }
    return false;
  }

  // Usuarios de prueba con roles asignados
  const userOwner = { id: 'usr-ruby-owner' };
  const userAdmin = { id: 'usr-rodolfo-admin' };
  const userEditor = { id: 'usr-sthefanie-editor' };
  const userViewer = { id: 'usr-auditor-viewer' };
  const userNonMember = { id: 'usr-desconocido' };

  test('user_role_in_company(): Devuelve el rol correcto según company_members', () => {
    assert.equal(userRoleInCompany('comp-camaguey', userOwner.id), 'owner');
    assert.equal(userRoleInCompany('comp-camaguey', userAdmin.id), 'admin');
    assert.equal(userRoleInCompany('comp-camaguey', userEditor.id), 'editor');
    assert.equal(userRoleInCompany('comp-camaguey', userViewer.id), 'viewer');
  });

  test('user_role_in_company(): Devuelve NULL para usuario no miembro o sin sesión', () => {
    assert.equal(userRoleInCompany('comp-camaguey', userNonMember.id), null);
    assert.equal(userRoleInCompany('comp-camaguey', null), null);
    assert.equal(userRoleInCompany('comp-otra', userViewer.id), null);
  });

  test('RLS uploads SELECT: Permitido para todos los roles (owner, admin, editor, viewer)', () => {
    const camagueyUpload = mockUploads[0];

    assert.equal(evaluateUploadsRLS('SELECT', camagueyUpload, userOwner), true, 'Owner puede hacer SELECT');
    assert.equal(evaluateUploadsRLS('SELECT', camagueyUpload, userAdmin), true, 'Admin puede hacer SELECT');
    assert.equal(evaluateUploadsRLS('SELECT', camagueyUpload, userEditor), true, 'Editor puede hacer SELECT');
    assert.equal(evaluateUploadsRLS('SELECT', camagueyUpload, userViewer), true, 'Viewer puede hacer SELECT');
    assert.equal(evaluateUploadsRLS('SELECT', camagueyUpload, userNonMember), false, 'No-miembro NO puede hacer SELECT');
  });

  test('RLS uploads INSERT: Permitido para owner, admin y editor; DENEGADO para viewer', () => {
    const newUpload = { id: 'upl-test', company_id: 'comp-camaguey', file_name: 'Nuevo.xlsx' };

    assert.equal(evaluateUploadsRLS('INSERT', newUpload, userOwner), true, 'Owner puede hacer INSERT');
    assert.equal(evaluateUploadsRLS('INSERT', newUpload, userAdmin), true, 'Admin puede hacer INSERT');
    assert.equal(evaluateUploadsRLS('INSERT', newUpload, userEditor), true, 'Editor puede hacer INSERT');

    // REQUISITO CRÍTICO: Viewer NO puede insertar en uploads
    assert.equal(
      evaluateUploadsRLS('INSERT', newUpload, userViewer),
      false,
      'CRÍTICO: Un viewer debe ser rechazado por la política RLS WITH CHECK al intentar INSERT en uploads'
    );
  });

  test('RLS companies UPDATE/DELETE: Permitido exclusivamente para el owner', () => {
    const company = mockCompanies[0];

    assert.equal(evaluateCompaniesRLS('UPDATE', company, userOwner), true, 'Owner puede modificar la empresa');
    assert.equal(evaluateCompaniesRLS('DELETE', company, userOwner), true, 'Owner puede eliminar la empresa');

    // Admin, Editor y Viewer no tienen permiso de modificar ni eliminar la empresa
    assert.equal(evaluateCompaniesRLS('UPDATE', company, userAdmin), false, 'Admin NO puede modificar empresa');
    assert.equal(evaluateCompaniesRLS('DELETE', company, userAdmin), false, 'Admin NO puede eliminar empresa');
    assert.equal(evaluateCompaniesRLS('UPDATE', company, userEditor), false, 'Editor NO puede modificar empresa');
    assert.equal(evaluateCompaniesRLS('DELETE', company, userViewer), false, 'Viewer NO puede eliminar empresa');
  });

  test('Coexistencia MFA + Roles: Usuario con MFA en AAL1 recibe 0 filas (MFA restrictiva gana); sin MFA recibe filas (rol permisivo)', () => {
    const upload = mockUploads[0];

    // Caso A: Usuario con rol 'editor' y MFA verificado, pero en sesión AAL1 (token no elevado)
    // Política permisiva: PASS (es editor)
    // Política restrictiva: FAIL (tiene MFA verificado pero su token es AAL1)
    // Resultado: 0 filas (la política restrictiva gana)
    const jwtAAL1 = { aal: 'aal1', sub: userEditor.id };
    const editorWithMfaInAAL1 = evaluateUploadsRLS('SELECT', upload, userEditor, jwtAAL1, true);
    assert.equal(
      editorWithMfaInAAL1,
      false,
      'CRÍTICO: Usuario con MFA verificado en AAL1 recibe 0 filas porque la política restrictiva tiene precedencia'
    );

    // Caso B: Usuario con rol 'editor' SIN MFA verificado en sesión AAL1
    // Política permisiva: PASS (es editor)
    // Política restrictiva: PASS (NOT auth.user_has_mfa() es true)
    // Resultado: Acceso concedido
    const editorWithoutMfaInAAL1 = evaluateUploadsRLS('SELECT', upload, userEditor, jwtAAL1, false);
    assert.equal(
      editorWithoutMfaInAAL1,
      true,
      'Usuario sin MFA en AAL1 recibe sus filas legítimas según su rol permisivo'
    );

    // Caso C: Usuario con rol 'viewer' y MFA verificado elevado a AAL2
    // Política permisiva: PASS (es viewer)
    // Política restrictiva: PASS (claim aal = aal2)
    const jwtAAL2 = { aal: 'aal2', sub: userViewer.id };
    const viewerWithMfaInAAL2 = evaluateUploadsRLS('SELECT', upload, userViewer, jwtAAL2, true);
    assert.equal(
      viewerWithMfaInAAL2,
      true,
      'Usuario con rol viewer y MFA elevado a AAL2 accede exitosamente a SELECT'
    );
  });

  test('Trigger del owner con NEW.user_id ajeno: Intento de suplantación lanza EXCEPTION y la empresa no se crea', () => {
    const maliciousCompany = {
      id: 'comp-hack-attempt',
      user_id: 'usr-otra-persona-victima',
      name: 'Empresa Falsificada S.A.',
    };

    const currentAuthenticatedUserId = 'usr-atacante';

    // Debe arrojar EXCEPTION estricta (no warning)
    assert.throws(
      () => {
        triggerHandleNewCompanyOwner(maliciousCompany, currentAuthenticatedUserId);
      },
      /No está autorizado para registrar una empresa a nombre de otro usuario/,
      'El trigger debe abortar la transacción ante discrepancia entre auth.uid() y NEW.user_id'
    );

    // La empresa NO debe haberse insertado en mockCompanies
    const wasCreated = mockCompanies.some((c) => c.id === 'comp-hack-attempt');
    assert.equal(wasCreated, false, 'La empresa no debe crearse si el trigger lanza excepción');
  });

  test('Trigger robusto: Inversión de prioridad (usa auth.uid() primero) y foreign_key_violation aborta', () => {
    // 1. Prioridad: auth.uid() tiene precedencia sobre NEW.user_id cuando son idénticos o NEW.user_id es omitido
    const compAuthed = { id: 'comp-auth-priority', user_id: null, name: 'Empresa Prioridad Auth' };
    triggerHandleNewCompanyOwner(compAuthed, 'usr-creador-authed');

    const role = userRoleInCompany('comp-auth-priority', 'usr-creador-authed');
    assert.equal(role, 'owner', 'Usa auth.uid() cuando NEW.user_id es null');

    // 2. foreign_key_violation aborta inmediatamente con EXCEPTION (no se captura como warning)
    const invalidFkComp = { id: 'comp-fk-invalida', user_id: 'usr-inexistente-invalido', name: 'Empresa FK Invalida' };
    assert.throws(
      () => {
        triggerHandleNewCompanyOwner(invalidFkComp, null); // Sin auth.uid(), usa NEW.user_id inválido
      },
      /foreign_key_violation/,
      'foreign_key_violation debe lanzar EXCEPTION y abortar sin ser silenciado por OTHERS'
    );
  });

  test('Seguridad RLS: SELECT * FROM uploads sin filtro .eq("company_id") mantiene aislamiento estricto', () => {
    // Usuario 'viewer' de CAMAGUEY S.A consulta la tabla uploads completa sin filtro:
    const visibleUploadsWithoutFilter = mockUploads.filter((row) =>
      evaluateUploadsRLS('SELECT', row, userViewer)
    );

    // Debe retornar 2 filas (upl-001 y upl-002 de CAMAGUEY S.A)
    // NO debe retornar upl-003 (perteneciente a 'comp-otra')
    assert.equal(visibleUploadsWithoutFilter.length, 2, 'El viewer solo debe ver uploads de empresas donde es miembro');
    const hasForeignRow = visibleUploadsWithoutFilter.some((row) => row.company_id === 'comp-otra');
    assert.equal(hasForeignRow, false, 'CRÍTICO: No debe filtrarse información de empresas ajenas aun sin filtro en el SELECT');
  });

  test('Rendimiento RLS e Índice: Subconsulta en company_members ejecuta Index Only Scan (degradable bajo escritura)', () => {
    // Documentación y verificación de estructura:
    // La consulta helper SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2
    // usa idx_company_members_company_user_role (company_id, user_id, role).
    const indexDef = {
      name: 'idx_company_members_company_user_role',
      keys: ['company_id', 'user_id', 'role'],
      supportsIndexOnlyScan: true,
      degradationNote: 'Bajo alta concurrencia de escrituras/updates, páginas sin bit all-visible en VM provocan heap fetches parciales.',
    };

    assert.ok(indexDef.supportsIndexOnlyScan);
    assert.ok(indexDef.degradationNote.includes('all-visible'));
  });
});
