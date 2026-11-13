const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value;
}

function webUrl(value: string) {
  if (!value || value.length > 2048) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.href.length <= 2048 ? url.href : '';
  } catch { return ''; }
}

export function personalData(kind: string, body: Record<string, unknown>) {
  const str = (key: string) => {
    const value = body[key];
    return typeof value === 'string' ? value.trim() : '';
  };
  const title = str('title'), note = str('note');
  if (!title || title.length > 120 || note.length > 500) return null;
  if (kind === 'links') {
    const url = webUrl(str('url')), image = str('image'), category = str('category');
    const uploaded = image.length <= 800000 && /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(image);
    if (!url || category.length > 40 || (image && !uploaded && !webUrl(image))) return null;
    return {title, note, url, image: uploaded ? image : webUrl(image), category};
  }
  const date = str('date'), start = str('start'), end = str('end');
  if (!validDay(date) || !time.test(start) || !time.test(end) || end <= start) return null;
  return {title, note, date, start, end, done: body.done === true};
}
