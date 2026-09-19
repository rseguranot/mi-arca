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
        <Typography
          variant="caption"
          sx={{ color: strength.color, fontWeight: 800 }}
        >
          {strength.label}
        </Typography>
      </Stack>
      <Box
        aria-label={`Fortaleza: ${strength.label}`}
        sx={{
          height: 6,
          borderRadius: 8,
          bgcolor: "#e6ebe8",
          overflow: "hidden",
          mb: 1,
        }}
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

function ArcaHub({ memberships, onChoose, onCreated, onAccepted }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [invitations, setInvitations] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const loadInvitations = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("arca_invitations")
      .select(
        "id, church_id, arca_role, token, expires_at, churches(name, arca_code)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) setNotice(error.message);
    else setInvitations(data ?? []);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadInvitations);
  }, [loadInvitations]);

  const createArca = async (event) => {
    event.preventDefault();
    if (!supabase || !name.trim()) return;
    setLoading(true);
    setNotice("");
    const { data, error } = await supabase.rpc("create_arca", {
      arca_name: name,
      arca_city: city || null,
    });
    setLoading(false);
    if (error) return setNotice(error.message);
    onCreated(data);
  };

  const acceptInvitation = async (token) => {
    if (!supabase || !token) return;
    setLoading(true);
    setNotice("");
    const { data, error } = await supabase.rpc("accept_arca_invitation", {
      invitation_token: token.trim(),
    });
    setLoading(false);
    if (error) return setNotice(error.message);
    setInvitationToken("");
    await loadInvitations();
    onAccepted(data);
  };

  return (
    <Box className="auth-page">
      <Paper className="auth-card" elevation={0} sx={{ maxWidth: 680 }}>
        <Box className="auth-brand">
          <img src={logo} alt="Logo de Mi Arca" />
          <Typography variant="h5">Mi Arca</Typography>
        </Box>
        <Typography variant="h4">Elige tu Arca</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Puedes pertenecer a varias Arcas. Crea una nueva o únete con una
          invitación de tu administrador.
        </Typography>
        {notice && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}

        {memberships.length > 0 && (
          <Stack spacing={1.25} sx={{ mb: 3 }}>
            <Typography variant="subtitle2">Tus Arcas</Typography>
            {memberships.map((membership) => (
              <Paper
                key={membership.church_id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>
                    {membership.churches?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {membership.churches?.arca_code} ·{" "}
                    {membership.arca_role === "admin" ? "Admin" : "Educador"}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => onChoose(membership.church_id)}
                >
                  Entrar
                </Button>
              </Paper>
            ))}
          </Stack>
        )}

        {invitations.length > 0 && (
          <Stack spacing={1.25} sx={{ mb: 3 }}>
            <Typography variant="subtitle2">Invitaciones pendientes</Typography>
            {invitations.map((invitation) => (
              <Paper key={invitation.id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {invitation.churches?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Rol: {invitation.arca_role === "admin" ? "Admin" : "Educador"}
                </Typography>
                <Button
                  size="small"
                  sx={{ ml: 1 }}
                  onClick={() => acceptInvitation(invitation.token)}
                >
                  Aceptar invitación
                </Button>
              </Paper>
            ))}
          </Stack>
        )}

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Crear un Arca</Typography>
          <Box component="form" onSubmit={createArca} sx={{ mt: 1.5 }}>
            <Stack spacing={1.5}>
              <TextField
                label="Nombre del Arca"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <TextField
                label="Ciudad (opcional)"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !name.trim()}
              >
                Crear Arca y ser Admin
              </Button>
            </Stack>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6">Unirme con una invitación</Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ mt: 1.5 }}
          >
            <TextField
              label="Código de invitación"
              fullWidth
              value={invitationToken}
              onChange={(event) => setInvitationToken(event.target.value)}
            />
            <Button
              variant="outlined"
              disabled={loading || !invitationToken.trim()}
              onClick={() => acceptInvitation(invitationToken)}
            >
              Aceptar
            </Button>
          </Stack>
        </Paper>
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

function LoadingScreen() {
  return (
    <Box className="loading" role="status" aria-live="polite">
      <Box className="loading-scene" aria-hidden="true">
        <Box className="loading-cloud loading-cloud-one" />
        <Box className="loading-cloud loading-cloud-two" />
        <Box className="loading-ark">
          <svg viewBox="0 0 240 136" focusable="false">
            <path className="ark-halo" d="M43 62C56 16 88 7 120 7s64 9 77 55" />
            <path className="ark-roof" d="M56 61 84 29h80l28 32z" />
            <path className="ark-cabin" d="M70 62h100v37H70z" />
            <path className="ark-window" d="M90 72h17v15H90zm43 0h17v15h-17z" />
            <path
              className="ark-hull"
              d="M28 95h186c-11 25-30 35-57 35H85C57 130 39 118 28 95Z"
            />
            <path className="ark-hull-line" d="M42 108c38 7 112 7 158-1" />
            <path className="ark-pole" d="M120 28V12" />
            <path
              className="ark-flag"
              d="M121 14c16-7 29 1 39-5v19c-13 6-25-1-39 5Z"
            />
          </svg>
        </Box>
        <Box className="loading-wave loading-wave-back" />
        <Box className="loading-wave loading-wave-front" />
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#236548" }}>
          Cargando Mi Arca…
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preparando tu travesía
        </Typography>
      </Box>
    </Box>
  );
}

function App() {
  const [session, setSession] = useState(null),
    [church, setChurch] = useState(null),
    [memberships, setMemberships] = useState([]),
    [selectedChurchId, setSelectedChurchId] = useState(null),
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
    [authReady, setAuthReady] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [dialog, setDialog] = useState(null),
    [form, setForm] = useState({});
  const reload = useCallback(
    async (currentSession) => {
      if (!supabase || !currentSession) return;
      setLoading(true);
      setError("");
      const membershipResult = await supabase
        .from("memberships")
        .select("church_id, arca_role, churches(id,name,city,arca_code)")
        .order("created_at");
      if (membershipResult.error) {
        setError(membershipResult.error.message);
        setLoading(false);
        return;
      }
      const availableMemberships = membershipResult.data ?? [];
      setMemberships(availableMemberships);
      const persistedChurchId = localStorage.getItem("mi-arca-active-church");
      const activeMembership = availableMemberships.find(
        (membership) =>
          membership.church_id === (selectedChurchId ?? persistedChurchId),
      );
      setChurch(
        activeMembership
          ? {
              ...activeMembership.churches,
              arca_role: activeMembership.arca_role,
            }
          : null,
      );
      if (!activeMembership) {
        setData({
          groups: [],
          students: [],
          sessions: [],
          curricula: [],
          transactions: [],
          categories: [],
        });
        setLoading(false);
        return;
      }
      const churchId = activeMembership.church_id;
      const [
        groupsResult,
        studentsResult,
        sessionsResult,
        curriculaResult,
        transactionsResult,
        categoriesResult,
      ] = await Promise.all([
        supabase
          .from("groups")
          .select("*")
          .eq("church_id", churchId)
          .order("name"),
        supabase
          .from("students")
          .select("*")
          .eq("church_id", churchId)
          .order("last_name"),
        supabase
          .from("class_sessions")
          .select("*, groups(name), lessons(title)")
          .eq("church_id", churchId)
          .order("starts_at", { ascending: false }),
        supabase
          .from("curricula")
          .select("*")
          .eq("church_id", churchId)
          .order("starts_on", { ascending: false }),
        supabase
          .from("finance_transactions")
          .select("*, finance_categories(name)")
          .eq("church_id", churchId)
          .order("occurred_on", { ascending: false }),
        supabase
          .from("finance_categories")
          .select("*")
          .eq("church_id", churchId)
          .order("name"),
      ]);
      const firstError = [
        groupsResult,
        studentsResult,
        sessionsResult,
        curriculaResult,
        transactionsResult,
        categoriesResult,
      ].find((result) => result.error)?.error;
      if (firstError) setError(firstError.message);
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
    [selectedChurchId],
  );
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const setAuthenticatedSession = (nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setAuthReady(true);
      if (!nextSession) {
        setChurch(null);
        setMemberships([]);
        setSelectedChurchId(null);
        setLoading(false);
      }
    };
    supabase.auth
      .getSession()
      .then(({ data: { session: nextSession } }) =>
        setAuthenticatedSession(nextSession),
      );
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setAuthenticatedSession(nextSession);
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (authReady && session)
      void Promise.resolve().then(() => reload(session));
  }, [authReady, session, reload]);
  const chooseArca = (churchId) => {
    localStorage.setItem("mi-arca-active-church", churchId);
    setSelectedChurchId(churchId);
  };
  const openCreate = () => {
    setForm({});
    setDialog(active);
  };
  const save = async () => {
    if (!supabase || !church) return;
    if (dialog === "Invitación") {
      const { data: invitationToken, error: invitationError } =
        await supabase.rpc("create_arca_invitation", {
          target_church_id: church.id,
          invitee_email: form.email,
          invited_role: form.arca_role || "educator",
        });
      if (invitationError) setError(invitationError.message);
      else {
        setDialog(null);
        setMessage(
          `Invitación creada para ${form.email}. Comparte este código de forma privada: ${invitationToken}`,
        );
      }
      return;
    }
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
      await reload(session);
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
      await reload(session);
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
  if (loading) return <LoadingScreen />;
  if (!session)
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthScreen onReady={setSession} />
      </ThemeProvider>
    );
  if (!church)
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ArcaHub
          memberships={memberships}
          onChoose={chooseArca}
          onCreated={chooseArca}
          onAccepted={chooseArca}
        />
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
            <Typography color="text.secondary">{church.name}</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              {church.arca_role === "admin" && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setForm({ arca_role: "educator" });
                    setDialog("Invitación");
                  }}
                >
                  Invitar
                </Button>
              )}
              <Button
                onClick={() => {
                  localStorage.removeItem("mi-arca-active-church");
                  setSelectedChurchId(null);
                  setChurch(null);
                }}
              >
                Cambiar Arca
              </Button>
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
                {church.name}
              </Typography>
              <Typography variant="caption">
                {church.arca_role === "admin" ? "Admin" : "Educador"} ·{" "}
                {church.arca_code}
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
          {message && (
            <Alert
              severity="success"
              onClose={() => setMessage("")}
              sx={{ mb: 2 }}
            >
              {message}
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
          {type === "Invitación" && (
            <>
              {field("email", "Correo de la persona a invitar", "email")}
              <FormControl fullWidth>
                <InputLabel>Rol en el Arca</InputLabel>
                <Select
                  label="Rol en el Arca"
                  value={form.arca_role ?? "educator"}
                  onChange={(e) =>
                    setForm({ ...form, arca_role: e.target.value })
                  }
                >
                  <MenuItem value="educator">Educador</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Se generará un código privado para compartir con el correo
                indicado.
              </Typography>
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
