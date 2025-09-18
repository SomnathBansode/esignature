export const isSameOrigin = (u) => {
  try {
    const a = document.createElement("a");
    a.href = u;
    if (!a.protocol || !a.host) return false;
    return `${a.protocol}//${a.host}` === window.location.origin;
  } catch {
    return false;
  }
};
