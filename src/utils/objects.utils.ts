export function isEmptyObject(object: object) {
  if (object) {
    return Object.keys(object).length === 0;
  }

  return true;
}
