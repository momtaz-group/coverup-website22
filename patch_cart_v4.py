import sys

with open("src/app/cart/page.js", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Cart Layout Updates (Voucher, Tip, Notes)
# In cart/page.js, they are currently inside:
# <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
old_layout = """              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "كوبون الخصم" : "Discount Coupon"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="discountCode" type="text" placeholder="COVERUP10" value={formData.discountCode} onChange={(e) => { setFormData(prev => ({...prev, discountCode: e.target.value})); setCouponCode(e.target.value); }} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "إكرامية (اختياري)" : "Tip (Optional)"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="tipAmount" type="number" min="0" placeholder="0" value={formData.tipAmount} onChange={(e) => setFormData(prev => ({...prev, tipAmount: e.target.value}))} />
                    <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 'bold' }}>{locale === "ar" ? "ج.م" : "EGP"}</span>
                  </div>
                </div>
              </div>"""

new_layout = """              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "كوبون الخصم" : "Discount Coupon"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="discountCode" type="text" placeholder="COVERUP10" value={formData.discountCode} onChange={(e) => { setFormData(prev => ({...prev, discountCode: e.target.value})); setCouponCode(e.target.value); }} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "إكرامية (اختياري)" : "Tip (Optional)"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="tipAmount" type="number" min="0" placeholder="0" value={formData.tipAmount} onChange={(e) => setFormData(prev => ({...prev, tipAmount: e.target.value}))} />
                    <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 'bold' }}>{locale === "ar" ? "ج.م" : "EGP"}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{locale === "ar" ? "ملاحظات إضافية (اختياري)" : "Additional Notes (Optional)"}</label>
                  <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--line)', paddingBottom: '8px' }}>
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} name="notes" type="text" placeholder={locale === "ar" ? "اكتب أي ملاحظات للطلب هنا..." : "Any special requests..."} value={formData.notes} onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))} />
                  </div>
                </div>
              </div>"""

if old_layout in content:
    content = content.replace(old_layout, new_layout)
else:
    print("Could not find cart layout to replace.")
    sys.exit(1)

# 2. Add name field (recipientName) to addressForm state
if 'addressForm, setAddressForm] = useState({ label: "",' in content:
    content = content.replace(
        'addressForm, setAddressForm] = useState({ label: "",',
        'addressForm, setAddressForm] = useState({ recipientName: "", label: "",'
    )

if 'setAddressForm({ label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: true })' in content:
    content = content.replace(
        'setAddressForm({ label: "",',
        'setAddressForm({ recipientName: "", label: "",'
    )

# 3. Add Recipient Name to Cart UI
old_modal_start = """                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "اسم العنوان" : "Address Label"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.label} onChange={(e) => setAddressForm({...addressForm, label: e.target.value})} placeholder={locale === "ar" ? "المنزل" : "Home"} required />
                  </label>"""

new_modal_start = """                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "الاسم الشخصي" : "Recipient Name"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.recipientName} onChange={(e) => setAddressForm({...addressForm, recipientName: e.target.value})} placeholder={locale === "ar" ? "اسم المستلم" : "Full Name"} required />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "اسم العنوان" : "Address Label"}
                    <input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.label} onChange={(e) => setAddressForm({...addressForm, label: e.target.value})} placeholder={locale === "ar" ? "المنزل" : "Home"} required />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>"""

if old_modal_start in content:
    content = content.replace(old_modal_start, new_modal_start)
else:
    print("Could not find cart modal start.")
    sys.exit(1)

# 4. Replace Cart state input with Egypt Governorates dropdown
old_state_input = """<input style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} value={addressForm.state} onChange={(e) => setAddressForm({...addressForm, state: e.target.value})} />"""

gov_options = """
                      <option value="">{locale === "ar" ? "اختر المحافظة" : "Select Governorate"}</option>
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

new_state_input = f"""<select style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)', cursor: 'pointer' }} value={{addressForm.state}} onChange={{(e) => setAddressForm({{{{\\.\\.\\.addressForm, state: e.target.value}}}})}}>
{gov_options}
                    </select>"""

if old_state_input in content:
    content = content.replace(old_state_input, new_state_input.replace('\\.\\.\\.', '...'))
else:
    print("Could not find state input to replace in cart.")
    sys.exit(1)

with open("src/app/cart/page.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated cart successfully!")
