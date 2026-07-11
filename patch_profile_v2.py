import sys

with open("src/app/account/page.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add recipientName to locationForm state
if 'locationForm, setLocationForm] = useState({' in content:
    content = content.replace(
        'id: "",\n    label: "",',
        'id: "",\n    recipientName: "",\n    label: "",'
    )
if 'setLocationForm({ id: "", label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: false })' in content:
    content = content.replace(
        'setLocationForm({ id: "", label: "",',
        'setLocationForm({ id: "", recipientName: "", label: "",'
    )

# 2. Add textAlign: 'start' to ALL inputs in the inline UI (which I generated earlier)
# I will just replace 'outline: \'none\', fontSize:' with 'outline: \'none\', textAlign: \'start\', fontSize:'
content = content.replace("outline: 'none', fontSize:", "outline: 'none', textAlign: 'start', fontSize:")

# 3. Add autoComplete="new-password" to newPassword and confirmPassword inputs, and autoComplete="current-password" to oldPassword
content = content.replace(
    '<input type="password" value={oldPassword}',
    '<input type="password" autoComplete="current-password" value={oldPassword}'
)
content = content.replace(
    '<input type="password" minLength="8" value={newPassword}',
    '<input type="password" minLength="8" autoComplete="new-password" value={newPassword}'
)
content = content.replace(
    '<input type="password" minLength="8" value={confirmPassword}',
    '<input type="password" minLength="8" autoComplete="new-password" value={confirmPassword}'
)

# 4. Add recipientName and Postal Code to the Profile address form, and change state to <select>
old_address_form_top = """                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("اسم العنوان", "Address label")}
                              <input value={locationForm.label} onChange={(e) => setLocationForm({ ...locationForm, label: e.target.value })} placeholder={text("مثال: المنزل", "e.g. Home")} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>"""

new_address_form_top = """                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("الاسم الشخصي", "Recipient Name")}
                              <input value={locationForm.recipientName || ""} onChange={(e) => setLocationForm({ ...locationForm, recipientName: e.target.value })} placeholder={text("اسم المستلم", "Full Name")} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("اسم العنوان", "Address label")}
                              <input value={locationForm.label} onChange={(e) => setLocationForm({ ...locationForm, label: e.target.value })} placeholder={text("مثال: المنزل", "e.g. Home")} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>"""

if old_address_form_top in content:
    content = content.replace(old_address_form_top, new_address_form_top)
else:
    print("Could not find top of profile address form.")
    sys.exit(1)

old_state_input = """<input value={locationForm.state} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />"""

gov_options = """
                      <option value="">{text("اختر المحافظة", "Select Governorate")}</option>
                      <option value="القاهرة">القاهرة (Cairo)</option>
                      <option value="الجيزة">الجيزة (Giza)</option>
                      <option value="الإسكندرية">الإسكندرية (Alexandria)</option>
                      <option value="الدقهلية">الدقهلية (Dakahlia)</option>
                      <option value="الشرقية">الشرقية (Al Sharqia)</option>
                      <option value="المنوفية">المنوفية (Monufia)</option>
                      <option value="القليوبية">القليوبية (Qalyubia)</option>
                      <option value="البحيرة">البحيرة (Beheira)</option>
                      <option value="الغربية">الغربية (Gharbia)</option>
                      <option value="بورسعيد">بورسعيد (Port Said)</option>
                      <option value="دمياط">دمياط (Damietta)</option>
                      <option value="الإسماعيلية">الإسماعيلية (Ismailia)</option>
                      <option value="السويس">السويس (Suez)</option>
                      <option value="كفر الشيخ">كفر الشيخ (Kafr El Sheikh)</option>
                      <option value="الفيوم">الفيوم (Faiyum)</option>
                      <option value="بني سويف">بني سويف (Beni Suef)</option>
                      <option value="مطروح">مطروح (Matrouh)</option>
                      <option value="شمال سيناء">شمال سيناء (North Sinai)</option>
                      <option value="جنوب سيناء">جنوب سيناء (South Sinai)</option>
                      <option value="المنيا">المنيا (Minya)</option>
                      <option value="أسيوط">أسيوط (Asyut)</option>
                      <option value="سوهاج">سوهاج (Sohag)</option>
                      <option value="قنا">قنا (Qena)</option>
                      <option value="البحر الأحمر">البحر الأحمر (Red Sea)</option>
                      <option value="الأقصر">الأقصر (Luxor)</option>
                      <option value="أسوان">أسوان (Aswan)</option>
                      <option value="الوادي الجديد">الوادي الجديد (New Valley)</option>
"""

new_state_input = f"""<select value={{locationForm.state}} onChange={{(e) => setLocationForm({{{{\\.\\.\\.locationForm, state: e.target.value}}}}) }} style={{{{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }}}}>
{gov_options}
                              </select>"""

if old_state_input in content:
    content = content.replace(old_state_input, new_state_input.replace('\\.\\.\\.', '...'))
else:
    print("Could not find state input in profile.")
    sys.exit(1)


# Also we need to add Postal Code to the profile.
old_form_bottom = """                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المدينة", "City")}
                              <input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المحافظة", "State")}
                              """ + new_state_input.replace('\\.\\.\\.', '...') + """
                            </label>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>"""

new_form_bottom = """                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المدينة", "City")}
                              <input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المحافظة", "State")}
                              """ + new_state_input.replace('\\.\\.\\.', '...') + """
                            </label>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("الرمز البريدي", "Postal Code")}
                              <input value={locationForm.postalCode || ""} onChange={(e) => setLocationForm({ ...locationForm, postalCode: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("ملاحظات التوصيل", "Delivery Notes")}
                              <input value={locationForm.notes || ""} onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', textAlign: 'start', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>"""

if old_form_bottom in content:
    content = content.replace(old_form_bottom, new_form_bottom)
else:
    print("Could not find bottom of profile address form.")
    sys.exit(1)


with open("src/app/account/page.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated profile successfully!")
