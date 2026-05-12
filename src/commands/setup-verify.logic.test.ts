import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildVerifyPanelPayload,
  getRoleValidationError,
  isPendingExpired
} from './setup-verify.logic';

describe('setup verify logic', () => {
  it('checks pending expiration against the supplied clock', () => {
    assert.equal(isPendingExpired(2000, 1999), false);
    assert.equal(isPendingExpired(2000, 2000), true);
    assert.equal(isPendingExpired(2000, 2001), true);
  });

  it('validates role constraints with existing messages', () => {
    assert.equal(
      getRoleValidationError({
        botCanManageRoles: true,
        botHighestRoleCompareToRole: 1,
        guildId: 'guild-1',
        roleId: 'guild-1',
        roleManaged: false
      }),
      '不能將 @everyone 作為驗證身分組。'
    );

    assert.equal(
      getRoleValidationError({
        botCanManageRoles: true,
        botHighestRoleCompareToRole: 1,
        guildId: 'guild-1',
        roleId: 'role-1',
        roleManaged: true
      }),
      '不能發放由 Discord 或整合服務管理的身分組。'
    );

    assert.equal(
      getRoleValidationError({
        botCanManageRoles: false,
        botHighestRoleCompareToRole: 1,
        guildId: 'guild-1',
        roleId: 'role-1',
        roleManaged: false
      }),
      '機器人缺少 Manage Roles 權限。'
    );

    assert.equal(
      getRoleValidationError({
        botCanManageRoles: true,
        botHighestRoleCompareToRole: 0,
        guildId: 'guild-1',
        roleId: 'role-1',
        roleManaged: false
      }),
      '機器人的最高身分組必須高於要發放的 Verified 身分組。'
    );

    assert.equal(
      getRoleValidationError({
        botCanManageRoles: true,
        botHighestRoleCompareToRole: 1,
        guildId: 'guild-1',
        roleId: 'role-1',
        roleManaged: false
      }),
      null
    );
  });

  it('prepares verify panel payload data', () => {
    assert.deepEqual(
      buildVerifyPanelPayload({
        buttonLabel: '完成驗證',
        description: 'Description',
        image: 'https://example.com/verify.png',
        parsedColor: 0x2f80ed,
        roleId: 'role-1',
        title: 'Title'
      }),
      {
        buttonLabel: '完成驗證',
        color: 0x2f80ed,
        description: 'Description',
        image: 'https://example.com/verify.png',
        roleId: 'role-1',
        title: 'Title'
      }
    );
  });
});
