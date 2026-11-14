import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  ClipboardCheck,
  History,
  Search,
  Bell,
  Plus,
  LogOut,
  Menu,
  FileText,
  Clock3,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowLeft,
  Building2,
  ShieldCheck,
  Download,
  Upload,
  FolderPlus,
  RotateCw,
} from 'lucide-react';
import api from './api';
const status = {
    DRAFT: 'Bản nháp',
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    ARCHIVED: 'Lưu trữ',
  },
  colors = {
    DRAFT: 'bg-slate-100 text-slate-600',
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
    ARCHIVED: 'bg-violet-100 text-violet-700',
  };
const cls = (...a) => a.filter(Boolean).join(' ');
function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null')),
    nav = useNavigate();
  function done(d) {
    localStorage.setItem('token', d.accessToken);
    localStorage.setItem('lastCompany', d.user.companyCode);
    localStorage.setItem('user', JSON.stringify(d.user));
    setUser(d.user);
    nav('/');
  }
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }
  if (!user)
    return (
      <Routes>
        <Route path="/register" element={<Auth register done={done} />} />
        <Route path="*" element={<Auth done={done} />} />
      </Routes>
    );
  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 z-20 hidden w-64 bg-[#101a31] text-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <b className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600">H</b>
          <b>HồSơ360</b>
        </div>
        <div className="m-4 rounded-lg bg-white/5 p-3 text-sm">{user.companyName}</div>
        <nav className="space-y-1 px-3">
          {[
            ['/', LayoutDashboard, 'Tổng quan'],
            ['/dossiers', FolderOpen, 'Hồ sơ'],
            ['/files', FileText, 'Tài liệu'],
            ['/approvals', ClipboardCheck, 'Ký duyệt hồ sơ'],
            ['/users', Users, 'Tài khoản con'],
            ['/settings', Settings, 'Cài đặt & phân quyền'],
            ['/activity', History, 'Nhật ký hoạt động'],
          ].map(([to, I, label]) => (
            <NavLink
              end
              to={to}
              key={to}
              className={({ isActive }) =>
                cls(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm',
                  isActive ? 'bg-blue-600' : 'text-slate-300 hover:bg-white/10',
                )
              }
            >
              <I size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-white/10 p-4 text-sm">
          <div className="font-semibold">{user.fullName}</div>
          <div className="mb-3 text-xs text-slate-400">{user.role}</div>
          <button onClick={logout} className="flex items-center gap-2 text-slate-300">
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-white px-5">
          <div className="relative max-w-lg flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
            <input
              placeholder="Tìm hồ sơ, tài liệu, mã số..."
              className="w-full rounded-lg border bg-slate-50 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <Bell size={18} className="text-slate-500" />
          <span className="hidden text-sm font-semibold sm:block">{user.fullName}</span>
        </header>
        <div className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dossiers" element={<Dossiers />} />
            <Route path="/dossiers/new" element={<DossierForm />} />
            <Route path="/dossiers/:id" element={<Detail />} />
            <Route path="/files" element={<FileManager />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
function Btn({ children, onClick, type = 'button', kind = 'blue' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cls(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold',
        kind === 'blue'
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'border bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  );
}
function Card({ children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </section>
  );
}
function Title({ title, desc, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-blue-600">HồSơ360</div>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      {action}
    </div>
  );
}
function Field({ label, ...p }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      <input
        {...p}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}
function Badge({ s }) {
  return (
    <span className={cls('rounded-full px-2.5 py-1 text-xs font-semibold', colors[s])}>
      {status[s] || s}
    </span>
  );
}
function Table({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead className="text-xs text-slate-400">
          <tr>
            {['Mã hồ sơ', 'Tên hồ sơ', 'Loại hồ sơ', 'Ngày cập nhật', 'Trạng thái', ''].map((x) => (
              <th className="border-b px-3 py-3" key={x}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((x) => (
            <tr key={x.id} className="hover:bg-slate-50">
              <td className="px-3 py-3 font-semibold text-blue-700">{x.code}</td>
              <td className="px-3 py-3 font-medium">{x.title}</td>
              <td className="px-3 py-3">{x.category}</td>
              <td className="px-3 py-3">{new Date(x.updatedAt).toLocaleDateString('vi-VN')}</td>
              <td className="px-3 py-3">
                <Badge s={x.status} />
              </td>
              <td className="px-3 py-3">
                <a href={'/dossiers/' + x.id} className="text-blue-600">
                  <Eye size={16} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>}
    </div>
  );
}
function Dashboard() {
  const [d, setD] = useState({});
  useEffect(() => {
    api
      .get('/dashboard')
      .then((r) => setD(r.data))
      .catch(() => {});
  }, []);
  const items = [
    ['Tổng hồ sơ', d.total, FileText],
    ['Chờ duyệt', d.pending, Clock3],
    ['Đã duyệt', d.approved, CheckCircle2],
    ['Từ chối', d.rejected, XCircle],
  ];
  return (
    <>
      <Title
        title="Tổng quan"
        desc="Theo dõi tình hình hồ sơ và hoạt động doanh nghiệp."
        action={
          <Btn onClick={() => (location.href = '/dossiers/new')}>
            <Plus size={16} /> Thêm hồ sơ mới
          </Btn>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(([l, v, I]) => (
          <Card key={l}>
            <div className="flex justify-between text-sm text-slate-500">
              {l}
              <I className="text-blue-600" />
            </div>
            <div className="mt-3 text-3xl font-bold">{v ?? '—'}</div>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-bold">Hồ sơ gần đây</h2>
          <Table rows={d.recent || []} />
        </Card>
        <Card>
          <h2 className="font-bold">Tài khoản hoạt động</h2>
          <div className="mt-4 text-4xl font-bold text-blue-700">{d.users ?? '—'}</div>
          <p className="mt-2 text-sm text-slate-500">Số người dùng đang hoạt động</p>
        </Card>
      </div>
    </>
  );
}
function Dossiers() {
  const [rows, setRows] = useState([]),
    [q, Q] = useState(''),
    [st, S] = useState('');
  async function load() {
    setRows((await api.get('/dossiers', { params: { q, status: st } })).data);
  }
  useEffect(() => {
    load();
  }, [st]);
  return (
    <>
      <Title
        title="Danh sách hồ sơ"
        desc="Tìm kiếm và quản lý hồ sơ doanh nghiệp."
        action={
          <Btn onClick={() => (location.href = '/dossiers/new')}>
            <Plus size={16} /> Tạo hồ sơ
          </Btn>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => Q(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Tìm mã hoặc tên hồ sơ..."
            className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={st}
            onChange={(e) => S(e.target.value)}
            className="rounded-lg border px-3 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(status).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
          <Btn kind="white" onClick={load}>
            Tìm kiếm
          </Btn>
        </div>
        <Table rows={rows} />
      </Card>
    </>
  );
}
function DossierForm() {
  const nav = useNavigate(),
    [f, F] = useState({
      title: '',
      category: 'Hợp đồng',
      department: 'Hành chính',
      description: '',
    }),
    [err, E] = useState('');
  function ch(e) {
    F({ ...f, [e.target.name]: e.target.value });
  }
  async function save(e) {
    e.preventDefault();
    try {
      const r = await api.post('/dossiers', f);
      nav('/dossiers/' + r.data.id);
    } catch (x) {
      E(x.response?.data?.message || 'Lỗi tạo hồ sơ');
    }
  }
  return (
    <>
      <Title title="Tạo hồ sơ mới" desc="Nhập thông tin hồ sơ." />
      <Card>
        <form onSubmit={save} className="max-w-2xl space-y-4">
          <Field label="Tên hồ sơ *" name="title" required value={f.title} onChange={ch} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Loại hồ sơ
              <select
                name="category"
                value={f.category}
                onChange={ch}
                className="mt-2 w-full rounded-lg border p-2.5 text-sm"
              >
                <option>Hợp đồng</option>
                <option>Nhân sự</option>
                <option>Tài chính - Kế toán</option>
                <option>Pháp lý</option>
                <option>Khác</option>
              </select>
            </label>
            <Field label="Phòng ban" name="department" value={f.department} onChange={ch} />
          </div>
          <label className="block text-xs font-semibold">
            Mô tả
            <textarea
              name="description"
              value={f.description}
              onChange={ch}
              rows="4"
              className="mt-2 w-full rounded-lg border p-3 text-sm"
            />
          </label>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2">
            <Btn kind="white" onClick={() => nav('/dossiers')}>
              Hủy
            </Btn>
            <Btn type="submit">Lưu hồ sơ</Btn>
          </div>
        </form>
      </Card>
    </>
  );
}
function FlowSteps({ steps }) {
  const dot = {
    APPROVED: 'bg-emerald-500',
    PENDING: 'bg-blue-600',
    REJECTED: 'bg-rose-500',
    CHANGES: 'bg-amber-500',
  };
  const label = {
    WAITING: 'Chưa đến lượt',
    PENDING: 'Đang chờ ký',
    APPROVED: 'Đã ký',
    REJECTED: 'Từ chối',
    CHANGES: 'Yêu cầu chỉnh sửa',
    CANCELLED: 'Đã hủy',
  };
  return (
    <ol className="mt-3 space-y-3">
      {steps.map((s) => (
        <li key={s.id} className="flex gap-3 text-sm">
          <span
            className={cls('mt-1 h-3 w-3 shrink-0 rounded-full', dot[s.status] || 'bg-slate-300')}
          />
          <div>
            <b>
              Bước {s.stepNo}: {s.title}
            </b>
            <div className="text-slate-500">
              {s.approver.fullName} · {label[s.status] || s.status}
              {s.signedAt && ' · ' + new Date(s.signedAt).toLocaleString('vi-VN')}
            </div>
            {s.comment && <div className="italic text-slate-500">“{s.comment}”</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
function FlowPicker({ steps, setSteps }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    api
      .get('/users')
      .then((r) =>
        setUsers(r.data.filter((u) => u.active && ['ADMIN', 'MANAGER'].includes(u.role))),
      )
      .catch(() => {});
  }, []);
  const upd = (i, k, v) => setSteps(steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  return (
    <div className="mt-5 space-y-2">
      <h3 className="font-semibold">Quy trình ký duyệt</h3>
      {steps.map((s, i) => (
        <div key={i} className="flex flex-wrap gap-2">
          <input
            value={s.title}
            onChange={(e) => upd(i, 'title', e.target.value)}
            placeholder="Tên bước"
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <select
            value={s.approverId}
            onChange={(e) => upd(i, 'approverId', e.target.value)}
            className="rounded-lg border px-3 text-sm"
          >
            <option value="">Chọn người ký</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role})
              </option>
            ))}
          </select>
          {steps.length > 1 && (
            <Btn kind="white" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
              Xóa
            </Btn>
          )}
        </div>
      ))}
      {steps.length < 5 && (
        <Btn kind="white" onClick={() => setSteps([...steps, { title: '', approverId: '' }])}>
          + Thêm bước
        </Btn>
      )}
    </div>
  );
}
function Detail() {
  const me = JSON.parse(localStorage.getItem('user') || '{}');
  const { id } = useParams(),
    nav = useNavigate();
  const [x, X] = useState(null),
    [msg, M] = useState(''),
    [comment, C] = useState('');
  const [steps, setSteps] = useState([{ title: 'Trưởng phòng', approverId: '' }]);
  async function load() {
    try {
      X((await api.get('/dossiers/' + id)).data);
    } catch (e) {
      M('Không tìm thấy hồ sơ');
    }
  }
  useEffect(() => {
    load();
  }, [id]);
  async function act(path, data) {
    try {
      await api.post(`/dossiers/${id}/${path}`, data || {});
      await load();
      M('Đã cập nhật');
    } catch (e) {
      const m = e.response?.data?.message;
      M(Array.isArray(m) ? m.join(', ') : m || 'Thao tác thất bại');
    }
  }
  if (!x) return <p>{msg || 'Đang tải...'}</p>;
  const mine =
    x.status === 'PENDING' && x.steps.find((s) => s.status === 'PENDING' && s.approverId === me.id);
  const canSubmit = me.role !== 'VIEWER' && ['DRAFT', 'REJECTED'].includes(x.status);
  return (
    <>
      <button
        onClick={() => nav('/dossiers')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-500"
      >
        <ArrowLeft size={16} /> Quay lại
      </button>
      <Title title="Chi tiết hồ sơ" desc={x.code} />
      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <div className="flex justify-between gap-3">
            <h2 className="text-xl font-bold">{x.title}</h2>
            <Badge s={x.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {x.category} · {x.department}
          </p>
          <hr className="my-5" />
          <h3 className="font-semibold">Mô tả</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
            {x.description || 'Chưa có mô tả'}
          </p>
          {canSubmit && (
            <>
              <FlowPicker steps={steps} setSteps={setSteps} />
              <div className="mt-4">
                <Btn onClick={() => act('submit', { steps })}>
                  <ClipboardCheck size={16} /> Gửi duyệt
                </Btn>
              </div>
            </>
          )}
          {mine && (
            <div className="mt-5 space-y-3">
              <h3 className="font-semibold">
                Bạn là người ký bước {mine.stepNo}: {mine.title}
              </h3>
              <textarea
                value={comment}
                onChange={(e) => C(e.target.value)}
                placeholder="Ý kiến (không bắt buộc)..."
                className="w-full rounded-lg border p-3 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => act('decision', { decision: 'APPROVED', comment })}>
                  Ký duyệt
                </Btn>
                <Btn kind="white" onClick={() => act('decision', { decision: 'CHANGES', comment })}>
                  Yêu cầu chỉnh sửa
                </Btn>
                <Btn
                  kind="white"
                  onClick={() => act('decision', { decision: 'REJECTED', comment })}
                >
                  Từ chối
                </Btn>
              </div>
            </div>
          )}
          {msg && <p className="mt-3 text-sm text-blue-600">{msg}</p>}
        </Card>
        <Card>
          <h3 className="font-bold">Thông tin hồ sơ</h3>
          <p className="mt-4 text-sm">
            Người tạo: <b>{x.createdBy?.fullName}</b>
          </p>
          <p className="mt-2 text-sm">Ngày tạo: {new Date(x.createdAt).toLocaleString('vi-VN')}</p>
          <h3 className="mt-6 font-bold">Quy trình ký duyệt</h3>
          {x.steps.length ? (
            <FlowSteps steps={x.steps} />
          ) : (
            <p className="mt-2 text-sm text-slate-400">Chưa gửi duyệt.</p>
          )}
        </Card>
      </div>
    </>
  );
}
function UsersPage() {
  const [rows, R] = useState([]),
    [show, S] = useState(false),
    [f, F] = useState({
      fullName: '',
      email: '',
      department: '',
      role: 'STAFF',
      password: 'ChangeMe123!',
    }),
    [msg, M] = useState('');
  async function load() {
    try {
      R((await api.get('/users')).data);
    } catch (e) {
      M(e.response?.data?.message || 'Không tải được');
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save(e) {
    e.preventDefault();
    try {
      await api.post('/users', f);
      S(false);
      M('Đã tạo tài khoản');
      load();
    } catch (e) {
      M(e.response?.data?.message || 'Không thể tạo tài khoản');
    }
  }
  return (
    <>
      <Title
        title="Tài khoản con"
        desc="Quản lý người dùng trong doanh nghiệp."
        action={
          JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN' && (
            <Btn onClick={() => S(!show)}>
              <Plus size={16} /> Thêm tài khoản
            </Btn>
          )
        }
      />
      {show && (
        <Card>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Họ tên"
              required
              value={f.fullName}
              onChange={(e) => F({ ...f, fullName: e.target.value })}
            />
            <Field
              label="Email"
              type="email"
              required
              value={f.email}
              onChange={(e) => F({ ...f, email: e.target.value })}
            />
            <Field
              label="Phòng ban"
              value={f.department}
              onChange={(e) => F({ ...f, department: e.target.value })}
            />
            <label className="text-xs font-semibold">
              Vai trò
              <select
                value={f.role}
                onChange={(e) => F({ ...f, role: e.target.value })}
                className="mt-2 w-full rounded-lg border p-2.5"
              >
                <option>STAFF</option>
                <option>MANAGER</option>
                <option>VIEWER</option>
              </select>
            </label>
            <Field
              label="Mật khẩu tạm"
              value={f.password}
              onChange={(e) => F({ ...f, password: e.target.value })}
            />
            <div className="flex items-end">
              <Btn type="submit">Tạo tài khoản</Btn>
            </div>
          </form>
        </Card>
      )}
      <Card>
        <h3 className="mb-4 font-bold">Danh sách người dùng ({rows.length})</h3>
        {msg && <p className="mb-3 text-sm text-blue-600">{msg}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                {['Họ tên', 'Email', 'Phòng ban', 'Vai trò', 'Trạng thái'].map((a) => (
                  <th className="border-b p-3" key={a}>
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3 font-medium">{u.fullName}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.department}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{u.active ? 'Hoạt động' : 'Khóa'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
function FileManager() {
  const me = JSON.parse(localStorage.getItem('user') || '{}');
  const [folderId, setFolderId] = useState(null),
    [trail, setTrail] = useState([]),
    [folders, setFolders] = useState([]),
    [files, setFiles] = useState([]),
    [dossiers, setDossiers] = useState([]),
    [folderName, setFolderName] = useState(''),
    [uploadFile, setUploadFile] = useState(null),
    [dossierId, setDossierId] = useState(''),
    [message, setMessage] = useState(''),
    [historyFile, setHistoryFile] = useState(null),
    [versions, setVersions] = useState([]),
    [preview, setPreview] = useState(null);
  const canWrite = ['ADMIN', 'MANAGER', 'STAFF'].includes(me.role);

  async function load() {
    try {
      const params = folderId === null ? {} : { folderId };
      const parentParams = folderId === null ? {} : { parentId: folderId };
      const [folderResult, fileResult, dossierResult] = await Promise.all([
        api.get('/folders', { params: parentParams }),
        api.get('/files', { params }),
        api.get('/dossiers'),
      ]);
      setFolders(folderResult.data);
      setFiles(fileResult.data);
      setDossiers(dossierResult.data);
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không thể tải thư mục và tệp');
    }
  }

  useEffect(() => {
    load();
  }, [folderId]);
  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  function enterFolder(folder) {
    setTrail([...trail, folder]);
    setFolderId(folder.id);
    setHistoryFile(null);
  }

  function returnTo(index) {
    const nextTrail = index < 0 ? [] : trail.slice(0, index + 1);
    setTrail(nextTrail);
    setFolderId(nextTrail.length ? nextTrail[nextTrail.length - 1].id : null);
    setHistoryFile(null);
  }

  async function createFolder(e) {
    e.preventDefault();
    try {
      await api.post('/folders', { name: folderName, parentId: folderId });
      setFolderName('');
      setMessage('Đã tạo thư mục');
      await load();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không thể tạo thư mục');
    }
  }

  async function upload(e) {
    e.preventDefault();
    if (!uploadFile) return setMessage('Vui lòng chọn tệp cần tải lên');
    const data = new FormData();
    data.append('file', uploadFile);
    if (folderId !== null) data.append('folderId', String(folderId));
    if (dossierId) data.append('dossierId', dossierId);
    try {
      await api.post('/files', data);
      setUploadFile(null);
      setDossierId('');
      setMessage('Đã tải tệp lên');
      await load();
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không thể tải tệp lên');
    }
  }

  async function showHistory(file) {
    setHistoryFile(file);
    setVersions([]);
    try {
      setVersions((await api.get(`/files/${file.id}/versions`)).data);
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không thể tải lịch sử phiên bản');
    }
  }

  async function addVersion(file, selected) {
    if (!selected) return;
    const data = new FormData();
    data.append('file', selected);
    try {
      await api.post(`/files/${file.id}/versions`, data);
      setMessage(`Đã tải phiên bản mới cho ${file.originalName}`);
      await load();
      if (historyFile?.id === file.id) await showHistory(file);
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không thể tải phiên bản mới');
    }
  }

  async function getFileContent(file, version, download) {
    const extension = `.${file.originalName.split('.').pop()}`.toLowerCase();
    const previewable = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.csv'].includes(extension);
    if (!download && !previewable) {
      setPreview({ unsupported: true, name: file.originalName, file, version });
      return;
    }
    try {
      const response = await api.get(
        `/files/${file.id}/${download ? 'download' : 'content'}`,
        { params: version ? { version } : {}, responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data);
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        setPreview({ url, name: file.originalName, unsupported: false });
      }
    } catch (e) {
      setMessage(e.response?.data?.message || 'Không thể đọc nội dung tệp');
    }
  }

  const sizeLabel = (size) =>
    size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;

  return (
    <>
      <Title title="Tài liệu" desc="Quản lý thư mục, tệp đính kèm và các phiên bản." />
      {message && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {message}
          <button onClick={() => setMessage('')} aria-label="Đóng">×</button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <button className="font-semibold text-blue-700" onClick={() => returnTo(-1)}>
          Tài liệu của doanh nghiệp
        </button>
        {trail.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <span className="text-slate-400">/</span>
            <button className="text-blue-700" onClick={() => returnTo(index)}>
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>
      {canWrite && (
        <div className="mb-5 grid gap-4 xl:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-bold">Tạo thư mục</h2>
            <form onSubmit={createFolder} className="flex flex-wrap gap-2">
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                maxLength={100}
                required
                placeholder="Tên thư mục mới"
                className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <Btn type="submit"><FolderPlus size={16} /> Tạo thư mục</Btn>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-bold">Tải tệp lên</h2>
            <form onSubmit={upload} className="space-y-3">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={dossierId}
                  onChange={(e) => setDossierId(e.target.value)}
                  className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Không gắn với hồ sơ</option>
                  {dossiers.map((dossier) => (
                    <option key={dossier.id} value={dossier.id}>
                      {dossier.code} · {dossier.title}
                    </option>
                  ))}
                </select>
                <Btn type="submit"><Upload size={16} /> Tải lên</Btn>
              </div>
              <p className="text-xs text-slate-500">PDF, ảnh, Word, Excel, TXT hoặc CSV; tối đa 10 MB.</p>
            </form>
          </Card>
        </div>
      )}
      <Card>
        <h2 className="mb-4 font-bold">Thư mục và tệp</h2>
        {folders.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => enterFolder(folder)}
                className="flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-slate-50"
              >
                <FolderOpen className="text-blue-600" size={19} />
                <span className="font-medium">{folder.name}</span>
              </button>
            ))}
          </div>
        )}
        {files.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  {['Tên tệp', 'Hồ sơ', 'Kích thước', 'Phiên bản', 'Thao tác'].map((label) => (
                    <th className="border-b px-3 py-3" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {files.map((file) => (
                  <tr key={file.id}>
                    <td className="px-3 py-3">
                      <div className="font-medium">{file.originalName}</div>
                      <div className="text-xs text-slate-500">Tải bởi {file.createdBy.fullName}</div>
                    </td>
                    <td className="px-3 py-3">{file.dossier?.code || '—'}</td>
                    <td className="px-3 py-3">{sizeLabel(file.sizeBytes)}</td>
                    <td className="px-3 py-3">v{file.currentVersion} · {file._count.versions} phiên bản</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-3">
                        <button className="text-blue-700" onClick={() => getFileContent(file, null, false)}>
                          Xem
                        </button>
                        <button className="flex items-center gap-1 text-blue-700" onClick={() => getFileContent(file, null, true)}>
                          <Download size={14} /> Tải
                        </button>
                        <button className="text-blue-700" onClick={() => showHistory(file)}>Lịch sử</button>
                        {canWrite && (
                          <label className="flex cursor-pointer items-center gap-1 text-blue-700">
                            <RotateCw size={14} /> Phiên bản mới
                            <input
                              type="file"
                              accept={`.${file.originalName.split('.').pop()}`}
                              className="hidden"
                              onChange={(e) => {
                                addVersion(file, e.target.files?.[0]);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !folders.length ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có thư mục hoặc tệp.</p>
        ) : null}
      </Card>
      {historyFile && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Lịch sử phiên bản · {historyFile.originalName}</h2>
            <button className="text-sm text-slate-500" onClick={() => setHistoryFile(null)}>Đóng</button>
          </div>
          <div className="divide-y">
            {versions.map((version) => (
              <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <b>Phiên bản {version.version}</b> · {sizeLabel(version.sizeBytes)}
                  <div className="text-xs text-slate-500">
                    {version.createdBy.fullName} · {new Date(version.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="text-blue-700" onClick={() => getFileContent(historyFile, version.version, false)}>Xem</button>
                  <button className="text-blue-700" onClick={() => getFileContent(historyFile, version.version, true)}>Tải xuống</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {preview && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <b className="truncate">{preview.name}</b>
              <button className="px-3 py-1 text-sm text-slate-600" onClick={() => setPreview(null)}>Đóng</button>
            </div>
            {preview.unsupported ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded border bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-600">
                  Chưa hỗ trợ xem trước tệp Office trong demo local. Tải tệp xuống để mở bằng ứng dụng phù hợp.
                </p>
                <Btn onClick={() => getFileContent(preview.file, preview.version, true)}>
                  <Download size={16} /> Tải tệp xuống
                </Btn>
              </div>
            ) : (
              <iframe title={preview.name} src={preview.url} className="min-h-0 flex-1 rounded border" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
function Approvals() {
  const tabs = [
    ['mine', 'Chờ tôi ký'],
    ['signed', 'Đã ký'],
    ['rejected', 'Đã từ chối / trả lại'],
  ];
  const [tab, setTab] = useState('mine'),
    [rows, R] = useState([]);
  useEffect(() => {
    api
      .get('/approvals', { params: { tab } })
      .then((r) => R(r.data))
      .catch(() => R([]));
  }, [tab]);
  return (
    <>
      <Title title="Ký duyệt hồ sơ" desc="Các hồ sơ trong quy trình duyệt có tên bạn." />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, l]) => (
          <Btn key={k} kind={tab === k ? 'blue' : 'white'} onClick={() => setTab(k)}>
            {l}
          </Btn>
        ))}
      </div>
      <Card>
        {rows.map((s) => (
          <a
            key={s.id}
            href={'/dossiers/' + s.dossier.id}
            className="block border-b py-3 last:border-0"
          >
            <b>{s.dossier.title}</b>
            <div className="text-sm text-slate-500">
              {s.dossier.code} · Bước {s.stepNo}/{s.dossier.steps.length}: {s.title}
            </div>
          </a>
        ))}
        {!rows.length && <p className="py-8 text-center text-sm text-slate-400">Chưa có hồ sơ.</p>}
      </Card>
    </>
  );
}
function SettingsPage() {
  return (
    <>
      <Title title="Cài đặt & phân quyền" desc="Vai trò và quyền truy cập cơ bản." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="font-bold">Vai trò hệ thống</h3>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ['ADMIN', 'Quản trị doanh nghiệp – toàn quyền'],
              ['MANAGER', 'Quản lý – quản lý hồ sơ và phê duyệt'],
              ['STAFF', 'Nhân viên – tạo và gửi hồ sơ'],
              ['VIEWER', 'Chỉ xem – tra cứu hồ sơ'],
            ].map((a) => (
              <div key={a[0]} className="flex justify-between border-b pb-3">
                <b>{a[0]}</b>
                <span className="text-slate-500">{a[1]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <ShieldCheck className="text-blue-600" />
          <h3 className="mt-3 font-bold">Chính sách truy cập</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            API giới hạn thao tác phê duyệt và tạo tài khoản theo vai trò. Cần bổ sung quyền theo
            từng hồ sơ/phòng ban trước khi vận hành thật.
          </p>
        </Card>
      </div>
    </>
  );
}
function Activity() {
  const [rows, R] = useState([]);
  useEffect(() => {
    api
      .get('/activity')
      .then((r) => R(r.data))
      .catch(() => {});
  }, []);
  return (
    <>
      <Title title="Nhật ký hoạt động" desc="Theo dõi thao tác người dùng." />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                {['Thời gian', 'Người dùng', 'Hoạt động', 'Chi tiết'].map((x) => (
                  <th className="border-b p-3" key={x}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr className="border-b" key={a.id}>
                  <td className="p-3">{new Date(a.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="p-3">{a.user.fullName}</td>
                  <td className="p-3">{a.action}</td>
                  <td className="p-3">{a.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="py-8 text-center text-sm text-slate-400">Chưa có nhật ký.</p>
          )}
        </div>
      </Card>
    </>
  );
}
function Auth({ register = false, done }) {
  const nav = useNavigate(),
    [f, F] = useState({
      companyCode: localStorage.getItem('lastCompany') || '',
      fullName: '',
      companyName: '',
      taxCode: '',
      address: '',
      companyPhone: '',
      email: '',
      password: '',
    }),
    [err, E] = useState('');
  function ch(e) {
    F({ ...f, [e.target.name]: e.target.value });
  }
  async function submit(e) {
    e.preventDefault();
    try {
      done((await api.post('/auth/' + (register ? 'register' : 'login'), f)).data);
    } catch (e) {
      E(
        Array.isArray(e.response?.data?.message)
          ? e.response.data.message.join(', ')
          : e.response?.data?.message || 'Không kết nối được máy chủ',
      );
    }
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-[#101a31] p-12 text-white lg:flex">
        <b className="text-xl">HồSơ360</b>
        <div className="max-w-lg">
          <p className="mb-4 text-sm text-blue-300">NỀN TẢNG QUẢN LÝ DOANH NGHIỆP</p>
          <h1 className="text-4xl font-bold leading-tight">
            Mỗi doanh nghiệp một không gian hồ sơ riêng.
          </h1>
          <p className="mt-5 leading-7 text-slate-300">
            Lưu trữ, quản lý, theo dõi và phê duyệt hồ sơ tập trung.
          </p>
        </div>
        <p className="text-xs text-slate-500">© 2026 HồSơ360</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-lg space-y-4">
          <h2 className="text-2xl font-bold">{register ? 'Đăng ký doanh nghiệp' : 'Đăng nhập'}</h2>
          <p className="text-sm text-slate-500">
            {register ? 'Tạo không gian làm việc mới.' : 'Đăng nhập để tiếp tục quản lý hồ sơ.'}
          </p>
          {register && (
            <>
              <Field
                label="Tên doanh nghiệp"
                name="companyName"
                required
                value={f.companyName}
                onChange={ch}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Mã số thuế" name="taxCode" required value={f.taxCode} onChange={ch} />
                <Field
                  label="Số điện thoại"
                  name="companyPhone"
                  value={f.companyPhone}
                  onChange={ch}
                />
              </div>
              <Field label="Địa chỉ" name="address" value={f.address} onChange={ch} />
              <Field
                label="Họ tên quản trị viên"
                name="fullName"
                required
                value={f.fullName}
                onChange={ch}
              />
            </>
          )}
          <Field
            label="Mã doanh nghiệp (dùng khi đăng nhập)"
            name="companyCode"
            required
            placeholder="vd: anphat"
            value={f.companyCode}
            onChange={ch}
          />
          <Field label="Email" type="email" name="email" required value={f.email} onChange={ch} />
          <Field
            label="Mật khẩu (tối thiểu 8 ký tự)"
            type="password"
            name="password"
            required
            minLength="8"
            value={f.password}
            onChange={ch}
          />
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <Btn type="submit">{register ? 'Tạo doanh nghiệp' : 'Đăng nhập'}</Btn>
          <p className="text-sm text-slate-500">
            {register ? 'Đã có tài khoản?' : 'Chưa có doanh nghiệp?'}{' '}
            <button
              type="button"
              onClick={() => nav(register ? '/login' : '/register')}
              className="font-semibold text-blue-600"
            >
              {register ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
export default App;
