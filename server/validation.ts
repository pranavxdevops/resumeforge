import { HttpError } from './resumes';
export function validatePhotoOwnership(photo: string, userId: string) {
  if (
    photo &&
    (!photo.startsWith(`${userId}/`) || !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(png|jpg)$/.test(photo))
  )
    throw new HttpError(400, 'Choose a profile photo uploaded to your own account.');
}
