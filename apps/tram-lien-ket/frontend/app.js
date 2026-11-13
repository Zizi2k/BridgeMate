import { API_BASE } from './config.js';

const $ = id => document.getElementById(id);
const state = { links: [], tasks: [], kind: 'links', token: sessionStorage.getItem('tram-session') || '' };
const localDay = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const dateText = date => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
$('day').value = localDay();
$('today-label').textContent = dateText(localDay());

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function button(label, handler, className) {
  const item = node('button', label, className);
  item.type = 'button';
  item.onclick = handler;
  return item;
}
async function api(path, method = 'GET', body) {
  if (!API_BASE) throw new Error('Chưa thiết lập địa chỉ API. Xem README để cấu hình.');
  let response;
  try {
    response = await fetch(API_BASE + '/api/' + path, {
      method, headers: { 'Content-Type': 'application/json', ...(state.token && { Authorization: 'Bearer ' + state.token }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch { throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.'); }
  if (response.status === 401 && path !== 'session') logout();
  if (response.status === 204) return;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Máy chủ chưa phản hồi. Vui lòng thử lại.');
  return data;
}
function logout() {
  state.token = '';
  state.links = [];
  state.tasks = [];
  sessionStorage.removeItem('tram-session');
  if ($('editor').open) $('editor').close();
  show(false);
}
function show(active) {
  $('login').hidden = active;
  $('workspace').hidden = !active;
  $('logout').hidden = !active;
  $('link-nav').disabled = !active;
  $('task-nav').disabled = !active;
}
function notice(message = '') {
  $('notice').hidden = !message;
  $('notice').textContent = message;
}
async function load() {
  const token = state.token;
  const [links, tasks] = await Promise.all([api('links'), api('tasks')]);
  if (token !== state.token) return;
  Object.assign(state, { links, tasks });
  show(true);
  render();
}
$('login-form').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button');
  submit.disabled = true;
  $('login-error').textContent = '';
  try {
    const { token } = await api('session', 'POST', { password: form.elements.password.value });
    state.token = token;
    sessionStorage.setItem('tram-session', token);
    await load();
    form.reset();
  } catch (error) { $('login-error').textContent = error.message; }
  finally { submit.disabled = false; }
};
$('logout').onclick = logout;
show(false);
if (state.token) load().catch(error => { $('login-error').textContent = error.message; });

function switchTo(kind) {
  state.kind = kind;
  const links = kind === 'links';
  $('links-panel').hidden = !links;
  $('tasks-panel').hidden = links;
  $('link-nav').classList.toggle('selected', links);
  $('task-nav').classList.toggle('selected', !links);
  $('link-nav').setAttribute('aria-current', links ? 'page' : 'false');
  $('task-nav').setAttribute('aria-current', links ? 'false' : 'page');
  $('heading').textContent = links ? 'Kho liên kết' : 'Kế hoạch ngày';
  $('intro').textContent = links ? 'Lưu và mở nhanh các website của bạn.' : 'Sắp xếp công việc theo khung giờ và theo dõi tiến độ.';
  notice();
  render();
}
$('link-nav').onclick = () => switchTo('links');
$('task-nav').onclick = () => switchTo('tasks');
$('search').oninput = renderLinks;
$('categories').onchange = renderLinks;
$('day').onchange = () => { if (!$('day').value) $('day').value = localDay(); renderTasks(); };
function shiftDay(offset) {
  const date = new Date(($('day').value || localDay()) + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  $('day').value = date.toISOString().slice(0, 10);
  renderTasks();
}
$('prev').onclick = () => shiftDay(-1);
$('next').onclick = () => shiftDay(1);
$('today').onclick = () => { $('day').value = localDay(); renderTasks(); };

function render() {
  const filter = $('categories').value;
  const categories = [...new Set(state.links.map(link => link.category).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'vi'));
  $('categories').replaceChildren(new Option('Tất cả danh mục', ''), ...categories.map(value => new Option(value, value)));
  if (categories.includes(filter)) $('categories').value = filter;
  renderLinks();
  renderTasks();
}
const fold = text => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
function anchor(item, label, className) {
  const a = node('a', label, className);
  a.href = item.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
function renderLinks() {
  const query = fold($('search').value.trim());
  const category = $('categories').value;
  const matches = state.links.filter(item => (!category || category === item.category) &&
    fold([item.title, item.url, item.note, item.category].join(' ')).includes(query));
  $('link-count').textContent = matches.length + ' liên kết';
  $('links').replaceChildren(...matches.map(item => {
    const card = node('article', '', 'card');
    const cover = anchor(item, '↗', 'cover');
    cover.setAttribute('aria-label', 'Mở ' + item.title + ' trong tab mới');
    if (item.image) {
      const img = node('img');
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => img.remove();
      img.src = item.image;
      cover.append(img);
    }
    const content = node('div', '', 'card-body');
    if (item.category) content.append(node('span', item.category, 'category'));
    const title = node('h3');
    title.append(anchor(item, item.title));
    content.append(title, node('div', new URL(item.url).hostname, 'muted'));
    if (item.note) content.append(node('p', item.note, 'muted'));
    content.append(actions('links', item));
    card.append(cover, content);
    return card;
  }));
  if (!matches.length) $('links').append(node('div', query || category ? 'Không tìm thấy liên kết phù hợp.' : 'Chưa có liên kết. Chọn “Thêm liên kết” để bắt đầu.', 'empty'));
}
function renderTasks() {
  const items = state.tasks.filter(item => item.date === $('day').value).sort((a,b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  $('task-count').textContent = items.filter(item => item.done).length + '/' + items.length + ' công việc hoàn thành';
  $('tasks').replaceChildren(...items.map(item => {
    const card = node('article', '', item.done ? 'task done' : 'task');
    const content = node('div');
    const label = node('label');
    const check = node('input');
    check.type = 'checkbox';
    check.checked = item.done;
    check.onchange = async () => {
      check.disabled = true;
      try { await saveEntry('tasks', { ...item, done: check.checked }, item.id); }
      catch (error) { check.checked = item.done; notice(error.message); }
      finally { check.disabled = false; }
    };
    label.append(check, document.createTextNode('Hoàn thành'));
    content.append(node('h3', item.title));
    if (item.note) content.append(node('p', item.note, 'muted'));
    content.append(label, actions('tasks', item));
    card.append(node('time', item.start + ' – ' + item.end), content);
    return card;
  }));
  if (!items.length) $('tasks').append(node('div', 'Chưa có công việc trong ngày này.', 'empty'));
}
function actions(kind, item) {
  const group = node('div', '', 'actions');
  group.append(button('Sửa', () => edit(kind, item)), button('Xóa', async event => {
    if (!confirm('Xóa “' + item.title + '”?')) return;
    const control = event.currentTarget;
    control.disabled = true;
    try {
      await api(kind + '/' + item.id, 'DELETE');
      state[kind] = state[kind].filter(row => row.id !== item.id);
      notice();
      render();
    } catch (error) { notice(error.message); }
    finally { control.disabled = false; }
  }, 'danger'));
  return group;
}
async function saveEntry(kind, data, id) {
  const item = await api(kind + (id ? '/' + id : ''), id ? 'PUT' : 'POST', data);
  state[kind] = id ? state[kind].map(row => row.id === id ? item : row) : [item, ...state[kind]];
  notice();
  render();
  return item;
}

const editor = $('editor');
let editing;
function edit(kind, item = {}) {
  editing = { kind, item };
  const link = kind === 'links';
  $('editor-title').textContent = (item.id ? 'Sửa ' : 'Thêm ') + (link ? 'liên kết' : 'công việc');
  $('form-error').textContent = '';
  $('fields').innerHTML = link ? `
    <label>Tên website<input name="title" required maxlength="120"></label>
    <label>Địa chỉ website<input name="url" required maxlength="2048" placeholder="https://example.com"></label>
    <label>Danh mục<input name="category" maxlength="40" placeholder="Ví dụ: Dự án, Học tập"></label>
    <label>Địa chỉ ảnh bìa<input name="image" type="url" maxlength="2048"></label>
    <label>Tải ảnh bìa<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>
    <label id="remove-wrap" class="actions"><input style="width:auto" name="remove" type="checkbox"> Bỏ ảnh hiện tại</label>
    <label>Ghi chú<textarea name="note" maxlength="500"></textarea></label>` : `
    <label>Tên công việc<input name="title" required maxlength="120"></label>
    <label>Ngày<input name="date" type="date" required></label>
    <div class="pair"><label>Bắt đầu<input name="start" type="time" required></label>
    <label>Kết thúc<input name="end" type="time" required></label></div>
    <label>Ghi chú<textarea name="note" maxlength="500"></textarea></label>`;
  const controls = $('entry-form').elements;
  const initial = link ? { ...item, image: item.image?.startsWith('data:') ? '' : item.image } :
    { date: $('day').value, start: '09:00', end: '10:00', ...item };
  for (const [name, value] of Object.entries(initial)) {
    if (controls.namedItem(name) && value !== undefined) controls.namedItem(name).value = value;
  }
  if (link) {
    $('remove-wrap').hidden = !item.image;
    controls.remove.onchange = () => { if (controls.remove.checked) controls.image.value = ''; };
  }
  editor.showModal();
}
$('new-link').onclick = () => edit('links');
$('new-task').onclick = () => edit('tasks');
$('close').onclick = $('cancel').onclick = () => editor.close();
editor.addEventListener('cancel', event => { if ($('save').disabled) event.preventDefault(); });

async function coverImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 12 * 1024 * 1024) {
    throw new Error('Chọn ảnh JPG, PNG, WebP hoặc GIF tối đa 12 MB.');
  }
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Không đọc được ảnh đã chọn.'); });
  const ratio = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
  const canvas = node('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/webp', .82);
}
$('entry-form').onsubmit = async event => {
  event.preventDefault();
  const { kind, item } = editing;
  const values = new FormData(event.currentTarget);
  const data = { title: values.get('title'), note: values.get('note') };
  for (const id of ['save', 'close', 'cancel']) $(id).disabled = true;
  $('form-error').textContent = '';
  try {
    if (kind === 'links') {
      const file = values.get('file');
      const address = values.get('url').trim();
      data.url = /^[a-z][a-z0-9+.-]*:\/\//i.test(address) ? address : 'https://' + address;
      data.category = values.get('category');
      data.image = file.size ? await coverImage(file) : values.get('image').trim() ||
        (values.has('remove') ? '' : item.image || '');
    } else {
      Object.assign(data, { date: values.get('date'), start: values.get('start'), end: values.get('end'), done: item.done || false });
    }
    const saved = await saveEntry(kind, data, item.id);
    if (kind === 'tasks') { $('day').value = saved.date; renderTasks(); }
    editor.close();
  } catch (error) { $('form-error').textContent = error.message; }
  finally { for (const id of ['save', 'close', 'cancel']) $(id).disabled = false; }
};
