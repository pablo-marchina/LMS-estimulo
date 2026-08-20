export type AdminProductSuccessNotice = {
  title: string;
  message: string;
};

export function getAdminProductSuccessNotice(
  code: string,
): AdminProductSuccessNotice;

export function getAdminProductErrorMessage(code: string): string;
