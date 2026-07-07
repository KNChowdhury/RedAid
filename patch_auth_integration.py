from pathlib import Path

# Patch App.tsx
app_path = Path('src/App.tsx')
text = app_path.read_text(encoding='utf-8')
old_import = "import { fetchSharedData, filterDonors, getAppState, saveAppState } from './services/lifelineService';\n"
new_import = "import { fetchSharedData, filterDonors, getAppState, getCurrentDonorFromSession, saveAppState, signOutDonor } from './services/lifelineService';\n"
old_effect = "  // Load real shared data from Supabase on app start\n  useEffect(() => {\n    fetchSharedData().then(({ donors, requests, badges }) => {\n      setState(prev => ({\n        ...prev,\n        donors: donors.length > 0 ? donors : prev.donors,\n        requests: requests.length > 0 ? requests : prev.requests,\n        badges: badges.length > 0 ? badges : prev.badges\n      }));\n    });\n  }, []);\n\n  // Current User coordinates\n"
new_effect = "  // Load real shared data from Supabase on app start\n  useEffect(() => {\n    fetchSharedData().then(({ donors, requests, badges }) => {\n      setState(prev => ({\n        ...prev,\n        donors: donors.length > 0 ? donors : prev.donors,\n        requests: requests.length > 0 ? requests : prev.requests,\n        badges: badges.length > 0 ? badges : prev.badges\n      }));\n    });\n  }, []);\n\n  // Restore logged-in session on app start\n  useEffect(() => {\n    getCurrentDonorFromSession().then(user => {\n      if (user) {\n        setState(prev => ({ ...prev, currentUser: user }));\n      }\n    });\n  }, []);\n\n  // Current User coordinates\n"
old_logout = "  const handleLogout = () => {\n    setState(prev => ({ ...prev, currentUser: null }));\n  };\n\n  const handleToggleCurrentUserAvailability = () => {\n"
new_logout = "  const handleLogout = () => {\n    signOutDonor();\n    setState(prev => ({ ...prev, currentUser: null }));\n  };\n\n  const handleToggleCurrentUserAvailability = () => {\n"

if old_import not in text:
    raise ValueError('Import line not found in App.tsx')
text = text.replace(old_import, new_import, 1)
if old_effect not in text:
    raise ValueError('Effect block not found in App.tsx')
text = text.replace(old_effect, new_effect, 1)
if old_logout not in text:
    raise ValueError('Logout block not found in App.tsx')
text = text.replace(old_logout, new_logout, 1)
app_path.write_text(text, encoding='utf-8')

# Patch lifelineService.ts
service_path = Path('src/services/lifelineService.ts')
text = service_path.read_text(encoding='utf-8')
insert_anchor = "  if (error) {\n    console.error('Supabase create request error:', error);\n    return null;\n  }\n  return mapDbRequestToRequest(data);\n}\n"
append_block = "\n// ============ SUPABASE AUTH ============\n\nexport async function signUpDonor(data: {\n  name: string;\n  email: string;\n  password: string;\n  phone: string;\n  bloodGroup: BloodGroup;\n  district: string;\n  area: string;\n  isSmoker: boolean;\n}): Promise<{ user: DonorProfile | null; error: string | null }> {\n  const { data: authData, error: authError } = await supabase.auth.signUp({\n    email: data.email,\n    password: data.password\n  });\n\n  if (authError || !authData.user) {\n    return { user: null, error: authError?.message || 'Sign up failed' };\n  }\n\n  const { lat, lng } = lookupCoordinates(data.district, data.area);\n\n  const { data: donorRow, error: donorError } = await supabase\n    .from('donors')\n    .insert({\n      auth_user_id: authData.user.id,\n      name: data.name,\n      email: data.email,\n      phone: data.phone,\n      whatsapp: data.phone.replace(/[^0-9]/g, ''),\n      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`,\n      role: 'donor',\n      blood_group: data.bloodGroup,\n      district: data.district,\n      area: data.area,\n      lat,\n      lng,\n      is_smoker: data.isSmoker,\n      is_regular: false,\n      is_verified: false,\n      available_now: true,\n      weight_kg: 0,\n      blood_pressure: '',\n      hemoglobin: 0,\n      has_chronic_disease: false,\n      recent_medication: '',\n      impact_score: 0,\n      lives_saved: 0\n    })\n    .select()\n    .single();\n\n  if (donorError || !donorRow) {\n    return { user: null, error: donorError?.message || 'Could not create donor profile' };\n  }\n\n  return { user: mapDbDonorToProfile(donorRow), error: null };\n}\n\nexport async function signInDonor(email: string, password: string): Promise<{ user: DonorProfile | null; error: string | null }> {\n  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });\n\n  if (authError || !authData.user) {\n    return { user: null, error: authError?.message || 'Sign in failed' };\n  }\n\n  const { data: donorRow, error: donorError } = await supabase\n    .from('donors')\n    .select('*')\n    .eq('auth_user_id', authData.user.id)\n    .single();\n\n  if (donorError || !donorRow) {\n    return { user: null, error: 'No donor profile found for this account' };\n  }\n\n  return { user: mapDbDonorToProfile(donorRow), error: null };\n}\n\nexport async function signOutDonor(): Promise<void> {\n  await supabase.auth.signOut();\n}\n\nexport async function getCurrentDonorFromSession(): Promise<DonorProfile | null> {\n  const { data: sessionData } = await supabase.auth.getSession();\n  const authUserId = sessionData.session?.user?.id;\n  if (!authUserId) return null;\n\n  const { data: donorRow, error } = await supabase\n    .from('donors')\n    .select('*')\n    .eq('auth_user_id', authUserId)\n    .single();\n\n  if (error || !donorRow) return null;\n  return mapDbDonorToProfile(donorRow);\n}\n"

if insert_anchor not in text:
    raise ValueError('Service insert anchor not found')
if 'signUpDonor' not in text and 'signInDonor' not in text:
    text = text.replace(insert_anchor, insert_anchor + append_block, 1)
    service_path.write_text(text, encoding='utf-8')

print('patch complete')
