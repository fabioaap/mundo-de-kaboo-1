export type FileUploadPreviewSize = 'sm' | 'md';

const FILE_UPLOAD_PREVIEW_SIZE_CLASS_NAME: Record<FileUploadPreviewSize, string> = {
  sm: 'w-24 h-24',
  md: 'w-32 h-32',
};

export const getFileUploadPreviewSizeClassName = (
  size: FileUploadPreviewSize = 'md'
): string => {
  return FILE_UPLOAD_PREVIEW_SIZE_CLASS_NAME[size];
};
