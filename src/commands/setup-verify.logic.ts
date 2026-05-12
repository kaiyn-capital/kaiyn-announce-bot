export interface PendingVerifyPanel {
  buttonLabel: string;
  channelId: string;
  expiresAt: number;
  guildId: string | null;
  image: string | null;
  parsedColor: number;
  roleId: string;
  title: string;
  userId: string;
}

export interface VerifyPanelInput {
  title: string;
  description: string;
  parsedColor: number;
  roleId: string;
  buttonLabel: string;
  image: string | null;
}

export interface VerifyPanelPayloadData {
  title: string;
  description: string;
  color: number;
  roleId: string;
  buttonLabel: string;
  image: string | null;
}

export interface RoleValidationInput {
  guildId: string;
  roleId: string;
  roleManaged: boolean;
  botCanManageRoles: boolean;
  botHighestRoleCompareToRole: number;
}

export function isPendingExpired(expiresAt: number, now: number): boolean {
  return expiresAt <= now;
}

export function getRoleValidationError({
  guildId,
  roleId,
  roleManaged,
  botCanManageRoles,
  botHighestRoleCompareToRole
}: RoleValidationInput): string | null {
  if (roleId === guildId) {
    return '不能將 @everyone 作為驗證身分組。';
  }

  if (roleManaged) {
    return '不能發放由 Discord 或整合服務管理的身分組。';
  }

  if (!botCanManageRoles) {
    return '機器人缺少 Manage Roles 權限。';
  }

  if (botHighestRoleCompareToRole <= 0) {
    return '機器人的最高身分組必須高於要發放的 Verified 身分組。';
  }

  return null;
}

export function buildVerifyPanelPayload({
  title,
  description,
  parsedColor,
  roleId,
  buttonLabel,
  image
}: VerifyPanelInput): VerifyPanelPayloadData {
  return {
    buttonLabel,
    color: parsedColor,
    description,
    image,
    roleId,
    title
  };
}
