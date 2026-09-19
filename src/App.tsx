// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Add,
  ArrowOutward,
  AssessmentOutlined,
  CalendarMonthOutlined,
  ChurchOutlined,
  DashboardOutlined,
  GroupsOutlined,
  MenuBookOutlined,
  PaymentsOutlined,
  PeopleAltOutlined,
  SaveOutlined,
  SchoolOutlined,
  LogoutOutlined,
} from "@mui/icons-material";
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import { supabase } from "./lib/supabase";
import logo from "./assets/mi-arca-logo.png";
import "./App.css";
import "./auth.css";

const drawerWidth = 254;
const theme = createTheme({
  palette: {
    primary: { main: "#236548" },
    secondary: { main: "#c69232" },
    background: { default: "#f5f7f4" },
  },
  typography: {
    fontFamily: "Manrope, Arial, sans-serif",
    h4: { fontWeight: 800 },
  },
  shape: { borderRadius: 15 },
});
const nav = [
  ["Inicio", DashboardOutlined],
  ["Estudiantes", PeopleAltOutlined],
  ["Grupos", GroupsOutlined],
  ["Calendario", CalendarMonthOutlined],
  ["Currículo", MenuBookOutlined],
  ["Finanzas", PaymentsOutlined],
  ["Reportes", AssessmentOutlined],
];
const titles = {
  Inicio: "Resumen de la escuela",
  Estudiantes: "Estudiantes",
  Grupos: "Grupos por edad",
  Calendario: "Sesiones y calendario",
  Currículo: "Currículo",
  Finanzas: "Libro mayor",
  Reportes: "Reportes",
};

const getPasswordStrength = (value: string) => {
  const checks = [
    { label: "Al menos 8 caracteres", passed: value.length >= 8 },
    { label: "Una letra minúscula", passed: /[a-z]/.test(value) },
    { label: "Una letra mayúscula", passed: /[A-Z]/.test(value) },
    { label: "Un número", passed: /\d/.test(value) },
  ];
  const requiredPassed = checks.filter((check) => check.passed).length;
  const bonus = Number(value.length >= 12) + Number(/[^A-Za-z0-9]/.test(value));
  const score = requiredPassed + bonus;
  const valid = requiredPassed === checks.length;

  if (!value)
    return { checks, valid, score: 0, label: "Sin evaluar", color: "#7a8580" };
  if (!valid)
    return {
      checks,
      valid,
      score,
      label: "Débil",
      color: "#c64545",
    };
  if (bonus === 0)
    return {
      checks,
      valid,
      score,
      label: "Fuerte",
      color: "#236548",
    };
  return { checks, valid, score, label: "Muy fuerte", color: "#176b52" };
};

function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  const progress = Math.min(100, (strength.score / 6) * 100);

  return (
    <Box
      aria-live="polite"
      sx={{
        border: "1px solid #dfe6e1",
        borderRadius: 2,
        bgcolor: "#fbfcfb",
        p: 1.5,
        mt: -0.75,
      }}
    >
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
        <Typography variant="caption" color="text.secondary">
          Seguridad de la contraseña
        </Typography>
        <Typography variant="caption" sx={{ color: strength.color, fontWeight: 800 }}>
          {strength.label}
        </Typography>
      </Stack>
      <Box
        aria-label={`Fortaleza: ${strength.label}`}
        sx={{ height: 6, borderRadius: 8, bgcolor: "#e6ebe8", overflow: "hidden", mb: 1 }}
      >
        <Box
          sx={{
            width: `${progress}%`,
            height: "100%",
            bgcolor: strength.color,
            transition: "width 180ms ease, background-color 180ms ease",
          }}
        />
      </Box>
      <Stack spacing={0.35}>
        {strength.checks.map((check) => (
          <Typography
            key={check.label}
            variant="caption"
            sx={{ color: check.passed ? "#236548" : "text.secondary" }}
          >
            {check.passed ? "✓" : "○"} {check.label}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

function AuthScreen({ onReady }) {
  const [isSignUp, setIsSignUp] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [form, setForm] = useState({
      first_name: "",
      last_name: "",
      username: "",
      sex: "undisclosed",
      birth_date: "",
      phone: "",
    }),
    [terms, setTerms] = useState(false),
    [avatar, setAvatar] = useState<File | null>(null),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false);
  const change = (key, value) => setForm({ ...form, [key]: value });
  const passwordStrength = getPasswordStrength(password);
  const uploadAvatar = async (userId) => {
    if (!avatar || !supabase) return;
    const extension = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });
    if (uploadError) throw uploadError;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_path: path })
      .eq("id", userId);
    if (profileError) throw profileError;
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!supabase) return setNotice("Falta configurar Supabase.");
    if (isSignUp) {
      if (!passwordStrength.valid)
        return setNotice(
          "La contraseña debe tener al menos 8 caracteres, una minúscula, una mayúscula y un número.",
        );
      if (password !== confirmPassword)
        return setNotice("Las contraseñas no coinciden.");
      if (!terms)
        return setNotice("Debes aceptar los términos y la privacidad.");
      if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(form.username.toLowerCase()))
        return setNotice(
          "El usuario debe tener 3–30 caracteres: letras, números, punto, guion o guion bajo.",
        );
    }
    setLoading(true);
    setNotice("");
    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { ...form, username: form.username.toLowerCase() } },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      setLoading(false);
      return setNotice(result.error.message);
    }
    if (result.data.session) {
      try {
        if (isSignUp) await uploadAvatar(result.data.session.user.id);
        onReady(result.data.session);
      } catch (uploadError) {
        setNotice(
          `Cuenta creada, pero no se pudo guardar la foto: ${uploadError.message}`,
        );
      }
    } else
      setNotice(
        "Cuenta creada. Revisa tu correo para confirmarla e inicia sesión.",
      );
    setLoading(false);
  };
  return (
    <Box className="auth-page">
      <Paper className="auth-card" elevation={0}>
        <Box className="auth-brand">
          <img src={logo} alt="Logo de Mi Arca" />
          <Typography variant="h5">Mi Arca</Typography>
        </Box>
        <Typography variant="h4">
          {isSignUp ? "Crea tu cuenta" : "Bienvenido de vuelta"}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {isSignUp
            ? "Completa tus datos para crear tu iglesia."
            : "Ingresa para gestionar tu escuela bíblica."}
        </Typography>
        {notice && (
          <Alert
            severity={
              notice.includes("creada") || notice.includes("correo")
                ? "success"
                : "error"
            }
            sx={{ mb: 2 }}
          >
            {notice}
          </Alert>
        )}
        <Box component="form" onSubmit={submit}>
          <Stack spacing={2}>
            {isSignUp && (
              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Nombres"
                    required
                    fullWidth
                    value={form.first_name}
                    onChange={(e) => change("first_name", e.target.value)}
                  />
                  <TextField
                    label="Apellidos"
                    required
                    fullWidth
                    value={form.last_name}
                    onChange={(e) => change("last_name", e.target.value)}
                  />
                </Stack>
                <TextField
                  label="Nombre de usuario"
                  required
                  fullWidth
                  helperText="3–30 caracteres: letras, números, . _ o -"
                  value={form.username}
                  onChange={(e) =>
                    change("username", e.target.value.toLowerCase())
                  }
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Sexo</InputLabel>
                    <Select
                      label="Sexo"
                      value={form.sex}
                      onChange={(e) => change("sex", e.target.value)}
                    >
                      <MenuItem value="female">Femenino</MenuItem>
                      <MenuItem value="male">Masculino</MenuItem>
                      <MenuItem value="undisclosed">
                        Prefiero no indicarlo
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Fecha de nacimiento"
                    type="date"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ max: new Date().toISOString().slice(0, 10) }}
                    value={form.birth_date}
                    onChange={(e) => change("birth_date", e.target.value)}
                  />
                </Stack>
                <TextField
                  label="Teléfono / WhatsApp (opcional)"
                  type="tel"
                  fullWidth
                  value={form.phone}
                  onChange={(e) => change("phone", e.target.value)}
                />
                <Button component="label" variant="outlined">
                  {avatar
                    ? `Foto seleccionada: ${avatar.name}`
                    : "Agregar foto de perfil (opcional)"}
                  <input
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
                  />
                </Button>
              </>
            )}
            <TextField
              label="Correo electrónico"
              type="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Contraseña"
              type="password"
              required
              fullWidth
              inputProps={{ minLength: 8 }}
              helperText={
                isSignUp
                  ? "Usa al menos 8 caracteres, mayúscula, minúscula y número."
                  : undefined
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isSignUp && <PasswordStrength password={password} />}
            {isSignUp && (
              <>
                <TextField
                  label="Confirmar contraseña"
                  type="password"
                  required
                  fullWidth
                  inputProps={{ minLength: 8 }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={terms}
                      onChange={(e) => setTerms(e.target.checked)}
                      required
                    />
                  }
                  label="Acepto los términos de uso y la política de privacidad."
                />
              </>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || (isSignUp && !passwordStrength.valid)}
            >
              {loading ? (
                <CircularProgress size={22} />
              ) : isSignUp ? (
                "Crear cuenta"
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </Stack>
        </Box>
        <Button
          sx={{ mt: 2 }}
          onClick={() => {
            setIsSignUp(!isSignUp);
            setNotice("");
          }}
        >
          {isSignUp ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}
        </Button>
      </Paper>
    </Box>
  );
}

function Metric({ label, value, note, icon: Icon }) {
  return (
    <Paper className="metric-card" elevation={0}>
      <Box className="metric-icon">
        <Icon />
      </Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4">{value}</Typography>
      <Typography variant="caption" color="text.secondary">
        {note}
      </Typography>
    </Paper>
  );
}

function App() {
  const [session, setSession] = useState(null),
    [church, setChurch] = useState(null),
    [active, setActive] = useState("Inicio"),
    [data, setData] = useState({
      groups: [],
      students: [],
      sessions: [],
      curricula: [],
      transactions: [],
      categories: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [dialog, setDialog] = useState(null),
    [form, setForm] = useState({});
  const reload = useCallback(
    async (currentSession = session) => {
      if (!supabase || !currentSession) return;
      setLoading(true);
      setError("");
      const [
        membershipResult,
        groupsResult,
        studentsResult,
        sessionsResult,
        curriculaResult,
        transactionsResult,
        categoriesResult,
      ] = await Promise.all([
        supabase
          .from("memberships")
          .select("church_id, role, churches(id,name,city)")
          .limit(1)
          .maybeSingle(),
        supabase.from("groups").select("*").order("name"),
        supabase.from("students").select("*").order("last_name"),
        supabase
          .from("class_sessions")
          .select("*, groups(name), lessons(title)")
          .order("starts_at", { ascending: false }),
        supabase
          .from("curricula")
          .select("*")
          .order("starts_on", { ascending: false }),
        supabase
          .from("finance_transactions")
          .select("*, finance_categories(name)")
          .order("occurred_on", { ascending: false }),
        supabase.from("finance_categories").select("*").order("name"),
      ]);
      const firstError = [
        membershipResult,
        groupsResult,
        studentsResult,
        sessionsResult,
        curriculaResult,
        transactionsResult,
        categoriesResult,
      ].find((result) => result.error)?.error;
      if (firstError) setError(firstError.message);
      const membership = membershipResult.data;
      setChurch(
        membership ? { ...membership.churches, role: membership.role } : null,
      );
      setData({
        groups: groupsResult.data ?? [],
        students: studentsResult.data ?? [],
        sessions: sessionsResult.data ?? [],
        curricula: curriculaResult.data ?? [],
        transactions: transactionsResult.data ?? [],
        categories: categoriesResult.data ?? [],
      });
      setLoading(false);
    },
    [session],
  );
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      setSession(nextSession);
      if (nextSession) reload(nextSession);
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession) reload(nextSession);
        else {
          setChurch(null);
          setLoading(false);
        }
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [reload]);
  const openCreate = () => {
    setForm({});
    setDialog(active);
  };
  const save = async () => {
    if (!supabase || !church) return;
    const base = { church_id: church.id };
    let table = "",
      values = {};
    if (dialog === "Grupos") {
      table = "groups";
      values = {
        ...base,
        name: form.name,
        min_age: Number(form.min_age) || null,
        max_age: Number(form.max_age) || null,
      };
    }
    if (dialog === "Estudiantes") {
      table = "students";
      values = {
        ...base,
        first_name: form.first_name,
        last_name: form.last_name,
        group_id: form.group_id || null,
        allergies: form.allergies || null,
      };
    }
    if (dialog === "Calendario") {
      table = "class_sessions";
      values = {
        ...base,
        group_id: form.group_id,
        starts_at: new Date(form.starts_at).toISOString(),
        notes: form.notes || null,
      };
    }
    if (dialog === "Currículo") {
      table = "curricula";
      values = {
        ...base,
        title: form.title,
        description: form.description || null,
        starts_on: form.starts_on || null,
      };
    }
    if (dialog === "Finanzas") {
      table = "finance_transactions";
      values = {
        ...base,
        category_id: form.category_id || null,
        type: form.type || "expense",
        concept: form.concept,
        amount: Number(form.amount),
        occurred_on: form.occurred_on || new Date().toISOString().slice(0, 10),
        created_by: session.user.id,
      };
    }
    const { error: saveError } = await supabase.from(table).insert(values);
    if (saveError) setError(saveError.message);
    else {
      setDialog(null);
      await reload();
    }
  };
  const createCategory = async () => {
    if (!supabase || !church || !form.name) return;
    const { error: saveError } = await supabase
      .from("finance_categories")
      .insert({
        church_id: church.id,
        name: form.name,
        budget_amount: Number(form.budget_amount) || 0,
      });
    if (saveError) setError(saveError.message);
    else {
      setDialog(null);
      await reload();
    }
  };
  const balance = useMemo(
    () =>
      data.transactions.reduce(
        (total, transaction) =>
          total +
          (transaction.type === "income"
            ? Number(transaction.amount)
            : -Number(transaction.amount)),
        0,
      ),
    [data.transactions],
  );
  const presentableStudents = data.students.slice(0, 6);
  if (loading)
    return (
      <Box className="loading">
        <CircularProgress />
        <Typography>Cargando Mi Arca…</Typography>
      </Box>
    );
  if (!session)
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthScreen onReady={setSession} />
      </ThemeProvider>
    );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <AppBar
          elevation={0}
          className="topbar"
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Typography color="text.secondary">
              {church?.name ?? "Configurando iglesia…"}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Avatar>{session.user.email?.slice(0, 2).toUpperCase()}</Avatar>
              <Button
                startIcon={<LogoutOutlined />}
                onClick={() => supabase.auth.signOut()}
              >
                Salir
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          className="drawer"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          <Box className="brand">
            <Box className="ark-mark">
              <img src={logo} alt="" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800 }} variant="h6">
                Mi Arca
              </Typography>
              <Typography variant="caption">Escuela bíblica</Typography>
            </Box>
          </Box>
          <Box className="church-switch">
            <Avatar>
              <ChurchOutlined />
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {church?.name ?? "Mi Iglesia"}
              </Typography>
              <Typography variant="caption">
                {church?.role === "director"
                  ? "Directora / Administradora"
                  : "Voluntario"}
              </Typography>
            </Box>
          </Box>
          <List className="menu">
            {nav.map(([label, Icon]) => (
              <ListItemButton
                key={label}
                selected={active === label}
                onClick={() => setActive(label)}
              >
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
        <Box component="main" className="content">
          <Box className="page-heading">
            <Box>
              <Typography
                variant="overline"
                color="primary.main"
                sx={{ fontWeight: 800 }}
              >
                GESTIÓN CONECTADA A SUPABASE
              </Typography>
              <Typography variant="h4">{titles[active]}</Typography>
              <Typography color="text.secondary">
                {active === "Inicio"
                  ? "Tus datos reales se actualizan desde tu iglesia."
                  : "Crea y administra la información de tu escuela."}
              </Typography>
            </Box>
            {active !== "Inicio" && active !== "Reportes" && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreate}
              >
                Agregar
              </Button>
            )}
          </Box>
          {error && (
            <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {active === "Inicio" && (
            <>
              <Box className="metrics">
                <Metric
                  label="Estudiantes activos"
                  value={data.students.length}
                  note="Registrados en tu iglesia"
                  icon={PeopleAltOutlined}
                />
                <Metric
                  label="Grupos activos"
                  value={data.groups.length}
                  note="Por edades"
                  icon={GroupsOutlined}
                />
                <Metric
                  label="Balance disponible"
                  value={`RD$ ${balance.toLocaleString("es-DO")}`}
                  note="Entradas menos salidas"
                  icon={PaymentsOutlined}
                />
              </Box>
              <Box className="dashboard-grid">
                <Paper className="today-card" elevation={0}>
                  <Typography variant="h6">Próxima sesión</Typography>
                  {data.sessions[0] ? (
                    <Box className="session-hero">
                      <SchoolOutlined color="primary" />
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>
                          {data.sessions[0].lessons?.title ??
                            "Clase programada"}
                        </Typography>
                        <Typography color="text.secondary">
                          {data.sessions[0].groups?.name} ·{" "}
                          {new Date(data.sessions[0].starts_at).toLocaleString(
                            "es-DO",
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Empty
                      text="Aún no hay sesiones. Crea un grupo y programa la primera."
                      action={() => setActive("Calendario")}
                    />
                  )}
                </Paper>
                <Paper className="finance-card" elevation={0}>
                  <Typography variant="h6">Actividad financiera</Typography>
                  <Typography variant="h4" sx={{ mt: 2 }}>
                    RD$ {balance.toLocaleString("es-DO")}
                  </Typography>
                  <Typography color="text.secondary">
                    Balance actualizado
                  </Typography>
                  <Button
                    sx={{ mt: 3 }}
                    endIcon={<ArrowOutward />}
                    onClick={() => setActive("Finanzas")}
                  >
                    Abrir finanzas
                  </Button>
                </Paper>
              </Box>
              <Paper className="students-card" elevation={0}>
                <Typography variant="h6">Estudiantes recientes</Typography>
                {presentableStudents.length ? (
                  presentableStudents.map((student) => (
                    <Box className="student-row" key={student.id}>
                      <Avatar>
                        {student.first_name[0]}
                        {student.last_name[0]}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>
                          {student.first_name} {student.last_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.allergies
                            ? `Alerta: ${student.allergies}`
                            : "Sin alertas médicas registradas"}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Empty
                    text="Registra tu primer estudiante para comenzar."
                    action={() => setActive("Estudiantes")}
                  />
                )}
              </Paper>
            </>
          )}
          {active === "Estudiantes" && (
            <RecordList
              records={data.students}
              empty="No hay estudiantes todavía."
              render={(student) => (
                <>
                  <strong>
                    {student.first_name} {student.last_name}
                  </strong>
                  <span>
                    {data.groups.find((group) => group.id === student.group_id)
                      ?.name ?? "Sin grupo"}{" "}
                    {student.allergies ? `· Alerta: ${student.allergies}` : ""}
                  </span>
                </>
              )}
            />
          )}
          {active === "Grupos" && (
            <RecordList
              records={data.groups}
              empty="Crea grupos por rango de edad."
              render={(group) => (
                <>
                  <strong>{group.name}</strong>
                  <span>
                    {group.min_age ?? "?"}–{group.max_age ?? "?"} años
                  </span>
                </>
              )}
            />
          )}
          {active === "Calendario" && (
            <RecordList
              records={data.sessions}
              empty="No hay sesiones programadas."
              render={(item) => (
                <>
                  <strong>{item.groups?.name ?? "Grupo"}</strong>
                  <span>
                    {new Date(item.starts_at).toLocaleString("es-DO")} ·{" "}
                    {item.status}
                  </span>
                </>
              )}
            />
          )}
          {active === "Currículo" && (
            <RecordList
              records={data.curricula}
              empty="No hay planes de estudio cargados."
              render={(item) => (
                <>
                  <strong>{item.title}</strong>
                  <span>{item.description || "Sin descripción"}</span>
                </>
              )}
            />
          )}
          {active === "Finanzas" && (
            <>
              <RecordList
                records={data.transactions}
                empty="No hay transacciones."
                render={(item) => (
                  <>
                    <strong>
                      {item.concept} · RD${" "}
                      {Number(item.amount).toLocaleString("es-DO")}
                    </strong>
                    <span>
                      {item.type === "income" ? "Entrada" : "Salida"} ·{" "}
                      {item.finance_categories?.name ?? "Sin categoría"}
                    </span>
                  </>
                )}
              />
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  setForm({});
                  setDialog("Categoría");
                }}
              >
                Nueva categoría
              </Button>
            </>
          )}
          {active === "Reportes" && (
            <Paper className="report-card" elevation={0}>
              <AssessmentOutlined color="primary" sx={{ fontSize: 42 }} />
              <Typography variant="h6">Indicadores disponibles</Typography>
              <Typography color="text.secondary">
                Estudiantes: {data.students.length} · Sesiones:{" "}
                {data.sessions.length} · Balance: RD${" "}
                {balance.toLocaleString("es-DO")}
              </Typography>
            </Paper>
          )}
        </Box>
        <CreateDialog
          open={Boolean(dialog)}
          type={dialog}
          form={form}
          setForm={setForm}
          groups={data.groups}
          categories={data.categories}
          onClose={() => setDialog(null)}
          onSave={dialog === "Categoría" ? createCategory : save}
        />
      </Box>
    </ThemeProvider>
  );
}
function Empty({ text, action }) {
  return (
    <Box className="empty">
      <Typography color="text.secondary">{text}</Typography>
      <Button onClick={action}>Ir al módulo</Button>
    </Box>
  );
}
function RecordList({ records, empty, render }) {
  return (
    <Paper className="record-list" elevation={0}>
      {records.length ? (
        records.map((record) => (
          <Box className="record-row" key={record.id}>
            {render(record)}
          </Box>
        ))
      ) : (
        <Empty text={empty} action={() => {}} />
      )}
    </Paper>
  );
}
function CreateDialog({
  open,
  type,
  form,
  setForm,
  groups,
  categories,
  onClose,
  onSave,
}) {
  const field = (key, label, type = "text") => (
    <TextField
      key={key}
      label={label}
      type={type}
      fullWidth
      value={form[key] ?? ""}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
    />
  );
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar {type}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {type === "Grupos" && (
            <>
              {field("name", "Nombre del grupo")}
              {field("min_age", "Edad mínima", "number")}
              {field("max_age", "Edad máxima", "number")}
            </>
          )}
          {type === "Estudiantes" && (
            <>
              {field("first_name", "Nombres")}
              {field("last_name", "Apellidos")}
              <FormControl fullWidth>
                <InputLabel>Grupo</InputLabel>
                <Select
                  label="Grupo"
                  value={form.group_id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, group_id: e.target.value })
                  }
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {field("allergies", "Alergias o alerta médica")}
            </>
          )}
          {type === "Calendario" && (
            <>
              <FormControl fullWidth>
                <InputLabel>Grupo</InputLabel>
                <Select
                  label="Grupo"
                  value={form.group_id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, group_id: e.target.value })
                  }
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {field("starts_at", "Fecha y hora", "datetime-local")}
              {field("notes", "Notas")}
            </>
          )}
          {type === "Currículo" && (
            <>
              {field("title", "Título")}
              {field("description", "Descripción")}
              {field("starts_on", "Inicio", "date")}
            </>
          )}
          {type === "Finanzas" && (
            <>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  label="Categoría"
                  value={form.category_id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, category_id: e.target.value })
                  }
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  label="Tipo"
                  value={form.type ?? "expense"}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <MenuItem value="income">Entrada</MenuItem>
                  <MenuItem value="expense">Salida</MenuItem>
                </Select>
              </FormControl>
              {field("concept", "Concepto")}
              {field("amount", "Monto", "number")}
              {field("occurred_on", "Fecha", "date")}
            </>
          )}
          {type === "Categoría" && (
            <>
              {field("name", "Nombre de categoría")}
              {field("budget_amount", "Presupuesto", "number")}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={<SaveOutlined />}
          onClick={onSave}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
export default App;
