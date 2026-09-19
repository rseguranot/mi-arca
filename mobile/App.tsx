import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "./lib/supabase";

const logo = require("./assets/mi-arca-logo.png");
const colors = { green: "#236548", greenDark: "#103d2d", gold: "#c69232", background: "#f4f7f2", border: "#dce7dd", muted: "#68776f", white: "#ffffff" };
const emptyProfile = { first_name: "", last_name: "", username: "", sex: "undisclosed", birth_date: "", phone: "" };

function Field({ label, value, onChangeText, ...props }: any) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholderTextColor="#87948d" style={styles.input} {...props} /></View>;
}
function PrimaryButton({ title, onPress, disabled = false, tone = "green" }: any) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, tone === "gold" && styles.goldButton, disabled && styles.disabledButton, pressed && !disabled && styles.pressed]}><Text style={styles.primaryButtonText}>{title}</Text></Pressable>;
}
function Loading() {
  return <SafeAreaView style={styles.loading}><Image source={logo} style={styles.loadingLogo} resizeMode="contain" /><ActivityIndicator color={colors.green} size="large" /><Text style={styles.muted}>Cargando Mi Arca…</Text></SafeAreaView>;
}

function AuthScreen({ onSignedIn }: any) {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState(emptyProfile);
  const [avatar, setAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const passwordIsValid = password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

  const selectAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setNotice("Necesitamos permiso para seleccionar una foto de perfil.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.75 });
    if (!result.canceled) setAvatar(result.assets[0]);
  };
  const uploadAvatar = async (userId: string) => {
    if (!avatar || !supabase) return;
    const extension = avatar.fileName?.split(".").pop()?.toLowerCase() || "jpg";
    const response = await fetch(avatar.uri);
    const path = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, await response.arrayBuffer(), { upsert: true, contentType: avatar.mimeType || "image/jpeg" });
    if (uploadError) throw uploadError;
    const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
    if (profileError) throw profileError;
  };
  const submit = async () => {
    if (!supabase) return;
    setNotice("");
    if (registering) {
      if (!profile.first_name || !profile.last_name || !profile.username || !profile.birth_date) return setNotice("Completa nombres, apellidos, usuario y fecha de nacimiento.");
      if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(profile.username)) return setNotice("El usuario debe tener 3–30 caracteres: letras, números, . _ o -.");
      if (!passwordIsValid) return setNotice("Usa 8 caracteres, mayúscula, minúscula y número.");
      if (password !== confirmPassword) return setNotice("Las contraseñas no coinciden.");
    }
    if (!email || !password) return setNotice("Ingresa correo y contraseña.");
    setBusy(true);
    const result = registering ? await supabase.auth.signUp({ email, password, options: { data: profile } }) : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setBusy(false); return setNotice(result.error.message); }
    if (result.data.session) {
      try { await uploadAvatar(result.data.session.user.id); onSignedIn(result.data.session); }
      catch { setNotice("Cuenta creada, pero no se pudo guardar la foto de perfil."); }
    } else setNotice("Cuenta creada. Confirma tu correo antes de iniciar sesión.");
    setBusy(false);
  };
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
    <View style={styles.brandBlock}><Image source={logo} style={styles.brandLogo} resizeMode="contain" /><Text style={styles.brand}>Mi Arca</Text></View>
    <View style={styles.card}>
      <Text style={styles.title}>{registering ? "Crea tu cuenta" : "Bienvenido"}</Text>
      <Text style={styles.subtitle}>{registering ? "Tus datos personales se completan aquí; lo demás, dentro de tu Arca." : "Ingresa para gestionar tu escuela bíblica."}</Text>
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {registering && <>
        <Field label="Nombres" value={profile.first_name} onChangeText={(first_name: string) => setProfile({ ...profile, first_name })} autoCapitalize="words" />
        <Field label="Apellidos" value={profile.last_name} onChangeText={(last_name: string) => setProfile({ ...profile, last_name })} autoCapitalize="words" />
        <Field label="Nombre de usuario" value={profile.username} onChangeText={(username: string) => setProfile({ ...profile, username: username.toLowerCase() })} autoCapitalize="none" />
        <Field label="Sexo (femenino, masculino u omitido)" value={profile.sex === "undisclosed" ? "" : profile.sex} onChangeText={(sex: string) => setProfile({ ...profile, sex: sex.toLowerCase() || "undisclosed" })} autoCapitalize="none" />
        <Field label="Fecha de nacimiento (AAAA-MM-DD)" value={profile.birth_date} onChangeText={(birth_date: string) => setProfile({ ...profile, birth_date })} placeholder="2000-01-31" autoCapitalize="none" />
        <Field label="Teléfono (opcional)" value={profile.phone} onChangeText={(phone: string) => setProfile({ ...profile, phone })} keyboardType="phone-pad" />
        <Pressable onPress={selectAvatar} style={styles.photoButton}><Text style={styles.photoButtonText}>{avatar ? "Foto seleccionada" : "Agregar foto de perfil (opcional)"}</Text></Pressable>
      </>}
      <Field label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      {registering && <><Text style={[styles.passwordHint, passwordIsValid && styles.passwordOk]}>{passwordIsValid ? "✓ Contraseña fuerte" : "8 caracteres, mayúscula, minúscula y número"}</Text><Field label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry /></>}
      <PrimaryButton title={busy ? "Procesando…" : registering ? "Crear cuenta" : "Iniciar sesión"} onPress={submit} disabled={busy} />
      <Pressable onPress={() => { setRegistering(!registering); setNotice(""); }} style={styles.linkButton}><Text style={styles.linkText}>{registering ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}</Text></Pressable>
    </View>
  </ScrollView></SafeAreaView>;
}

function ArcaHub({ memberships, onChoose, refresh }: any) {
  const [mode, setMode] = useState<"choice" | "create" | "join">("choice");
  const [name, setName] = useState(""); const [city, setCity] = useState(""); const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const createArca = async () => { if (!supabase || !name.trim()) return; setBusy(true); const { data, error } = await supabase.rpc("create_arca", { arca_name: name.trim(), arca_city: city.trim() || null }); setBusy(false); if (error) return setNotice(error.message); await refresh(); onChoose(data); };
  const joinArca = async () => { if (!supabase || !code.trim()) return; setBusy(true); const { data, error } = await supabase.rpc("accept_arca_invitation", { invitation_token: code.trim() }); setBusy(false); if (error) return setNotice(error.message); await refresh(); onChoose(data); };
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.hubContent}>
    <Image source={logo} style={styles.hubLogo} resizeMode="contain" /><Text style={styles.brand}>Mi Arca</Text>
    <Text style={styles.hubTitle}>{mode === "choice" ? "Comienza tu travesía" : mode === "create" ? "Crear arca" : "Unirse a un arca"}</Text><Text style={styles.hubSubtitle}>{mode === "choice" ? "Crea tu propia Arca o únete mediante una invitación." : "Completa la información para continuar."}</Text>
    {!!notice && <Text style={styles.notice}>{notice}</Text>}
    {mode === "choice" && memberships.length === 0 && <View style={styles.actionRow}>
      <Pressable accessibilityRole="button" onPress={() => setMode("create")} style={styles.action}><View style={styles.createCircle}><Text style={styles.actionIcon}>+</Text></View><Text style={styles.actionTitle}>Crear arca</Text><Text style={styles.actionCaption}>Un Arca nueva</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setMode("join")} style={styles.action}><View style={styles.joinCircle}><Text style={styles.actionIcon}>→</Text></View><Text style={styles.actionTitle}>Unirse a un arca</Text><Text style={styles.actionCaption}>Con invitación</Text></Pressable>
    </View>}
    {mode === "choice" && memberships.length > 0 && <View style={styles.membershipList}>{memberships.map((membership: any) => <Pressable key={membership.church_id} onPress={() => onChoose(membership.church_id)} style={styles.membershipCard}><Text style={styles.membershipName}>{membership.churches?.name}</Text><Text style={styles.membershipMeta}>{membership.churches?.arca_code} · {membership.arca_role === "admin" ? "Admin" : "Educador"}</Text></Pressable>)}<Pressable onPress={() => setMode("create")} style={styles.linkButton}><Text style={styles.linkText}>Crear otra Arca</Text></Pressable></View>}
    {mode === "create" && <View style={styles.formCard}><Field label="Nombre del Arca" value={name} onChangeText={setName} /><Field label="Ciudad (opcional)" value={city} onChangeText={setCity} /><PrimaryButton title={busy ? "Creando…" : "Crear arca y ser admin"} onPress={createArca} disabled={busy || !name.trim()} /><Pressable onPress={() => setMode("choice")} style={styles.linkButton}><Text style={styles.linkText}>Volver</Text></Pressable></View>}
    {mode === "join" && <View style={styles.formCard}><Field label="Código de invitación" value={code} onChangeText={setCode} autoCapitalize="characters" /><PrimaryButton title={busy ? "Uniendo…" : "Aceptar invitación"} onPress={joinArca} disabled={busy || !code.trim()} tone="gold" /><Pressable onPress={() => setMode("choice")} style={styles.linkButton}><Text style={styles.linkText}>Volver</Text></Pressable></View>}
  </ScrollView></SafeAreaView>;
}

function Dashboard({ church, onSignOut, onChangeArca }: any) {
  const modules = ["Estudiantes", "Grupos", "Calendario", "Currículo", "Finanzas", "Reportes"];
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.dashboardContent}>
    <View style={styles.dashboardHeader}><View><Text style={styles.eyebrow}>ARCA ACTIVA</Text><Text style={styles.dashboardTitle}>{church.name}</Text><Text style={styles.muted}>{church.arca_code}</Text></View><Image source={logo} style={styles.dashboardLogo} resizeMode="contain" /></View>
    <Text style={styles.sectionTitle}>Todo listo para comenzar</Text><Text style={styles.muted}>Registra estudiantes, organiza los grupos y prepara la primera clase.</Text>
    <View style={styles.moduleGrid}>{modules.map((module) => <Pressable key={module} style={styles.moduleCard} onPress={() => Alert.alert(module, "Este módulo continuará en la siguiente entrega móvil.")}><Text style={styles.moduleTitle}>{module}</Text><Text style={styles.moduleArrow}>›</Text></Pressable>)}</View>
    <Pressable onPress={onChangeArca} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cambiar de Arca</Text></Pressable><Pressable onPress={onSignOut} style={styles.linkButton}><Text style={styles.linkText}>Cerrar sesión</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

export default function App() {
  const [session, setSession] = useState<any>(null); const [memberships, setMemberships] = useState<any[]>([]); const [church, setChurch] = useState<any>(null); const [loading, setLoading] = useState(true);
  const reloadMemberships = useCallback(async () => { if (!supabase) return; const { data, error } = await supabase.from("memberships").select("church_id, arca_role, churches(id,name,city,arca_code)").order("created_at"); if (error) return Alert.alert("No se pudo cargar tus Arcas", error.message); const nextMemberships = data ?? []; setMemberships(nextMemberships); const persisted = globalThis.localStorage?.getItem("mi-arca-active-church"); const current = nextMemberships.find((membership: any) => membership.church_id === persisted) ?? nextMemberships[0]; setChurch(current ? { ...current.churches, arca_role: current.arca_role } : null); }, []);
  const chooseArca = (churchId: string) => { const membership = memberships.find((item) => item.church_id === churchId); globalThis.localStorage?.setItem("mi-arca-active-church", churchId); if (membership) setChurch({ ...membership.churches, arca_role: membership.arca_role }); };
  useEffect(() => { if (!supabase) { setLoading(false); return; } let mounted = true; supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false); } }); const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (mounted) setSession(nextSession); }); return () => { mounted = false; listener.subscription.unsubscribe(); }; }, []);
  useEffect(() => { if (session) void reloadMemberships(); else { setMemberships([]); setChurch(null); } }, [session, reloadMemberships]);
  if (loading) return <Loading />;
  if (!supabase) return <SafeAreaView style={styles.loading}><Text style={styles.title}>Configura Expo y Supabase</Text><Text style={styles.muted}>Copia .env.example como .env.local y agrega las variables públicas.</Text></SafeAreaView>;
  if (!session) return <AuthScreen onSignedIn={setSession} />;
  if (!church) return <ArcaHub memberships={memberships} onChoose={chooseArca} refresh={reloadMemberships} />;
  return <Dashboard church={church} onChangeArca={() => setChurch(null)} onSignOut={() => supabase!.auth.signOut()} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 28, backgroundColor: colors.background }, loadingLogo: { width: 108, height: 108 }, authContent: { padding: 24, paddingVertical: 42 }, brandBlock: { alignItems: "center", marginBottom: 24 }, brandLogo: { width: 80, height: 80 }, brand: { color: colors.green, fontFamily: "Georgia", fontSize: 30, fontWeight: "700" }, card: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 22, shadowColor: "#173e2d", shadowOpacity: 0.09, shadowRadius: 18, elevation: 3 }, title: { color: colors.greenDark, fontSize: 29, fontWeight: "800", lineHeight: 35 }, subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 19 }, notice: { backgroundColor: "#fff1ef", borderRadius: 12, color: "#aa3830", marginBottom: 16, padding: 12, lineHeight: 20 }, field: { marginBottom: 14 }, fieldLabel: { color: colors.greenDark, fontSize: 13, fontWeight: "700", marginBottom: 6 }, input: { backgroundColor: "#fbfcfa", borderColor: "#cbd8cf", borderWidth: 1, borderRadius: 12, color: "#1d2b23", fontSize: 16, minHeight: 48, paddingHorizontal: 14 }, passwordHint: { color: colors.muted, fontSize: 12, marginTop: -5, marginBottom: 12 }, passwordOk: { color: colors.green, fontWeight: "700" }, photoButton: { borderColor: "#b8cdbd", borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 13 }, photoButtonText: { color: colors.green, fontWeight: "700", textAlign: "center" }, primaryButton: { alignItems: "center", backgroundColor: colors.green, borderRadius: 14, minHeight: 50, justifyContent: "center", marginTop: 4, paddingHorizontal: 16 }, goldButton: { backgroundColor: colors.gold }, disabledButton: { backgroundColor: "#aab7af" }, pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] }, primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: "800" }, linkButton: { alignItems: "center", padding: 15 }, linkText: { color: colors.green, fontSize: 14, fontWeight: "800" }, hubContent: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: 28 }, hubLogo: { height: 124, width: 124 }, hubTitle: { color: colors.greenDark, fontFamily: "Georgia", fontSize: 35, fontWeight: "700", marginTop: 28, textAlign: "center" }, hubSubtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10, textAlign: "center" }, actionRow: { flexDirection: "row", gap: 24, justifyContent: "center", marginTop: 44, width: "100%" }, action: { alignItems: "center", flex: 1, maxWidth: 156 }, createCircle: { alignItems: "center", backgroundColor: colors.green, borderRadius: 75, height: 124, justifyContent: "center", width: 124 }, joinCircle: { alignItems: "center", backgroundColor: colors.gold, borderRadius: 75, height: 124, justifyContent: "center", width: 124 }, actionIcon: { color: colors.white, fontSize: 62, fontWeight: "300", marginTop: -5 }, actionTitle: { color: colors.greenDark, fontSize: 16, fontWeight: "800", marginTop: 13, textAlign: "center" }, actionCaption: { color: colors.muted, fontSize: 12, marginTop: 4, textAlign: "center" }, formCard: { alignSelf: "stretch", backgroundColor: colors.white, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginTop: 28, padding: 18 }, membershipList: { alignSelf: "stretch", marginTop: 28 }, membershipCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 18 }, membershipName: { color: colors.greenDark, fontSize: 17, fontWeight: "800" }, membershipMeta: { color: colors.muted, marginTop: 5 }, dashboardContent: { padding: 24, paddingTop: 34 }, dashboardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 34 }, dashboardLogo: { height: 72, width: 72 }, eyebrow: { color: colors.gold, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 }, dashboardTitle: { color: colors.greenDark, fontSize: 28, fontWeight: "800", marginTop: 4 }, muted: { color: colors.muted, fontSize: 14, lineHeight: 21 }, sectionTitle: { color: colors.greenDark, fontSize: 21, fontWeight: "800", marginBottom: 8 }, moduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 24 }, moduleCard: { backgroundColor: colors.white, borderColor: colors.border, borderRadius: 16, borderWidth: 1, minHeight: 102, padding: 16, width: "48%" }, moduleTitle: { color: colors.greenDark, fontSize: 16, fontWeight: "800" }, moduleArrow: { color: colors.gold, fontSize: 26, marginTop: 12 }, secondaryButton: { alignItems: "center", borderColor: colors.green, borderRadius: 14, borderWidth: 1, marginTop: 30, padding: 14 }, secondaryButtonText: { color: colors.green, fontWeight: "800" },
});
