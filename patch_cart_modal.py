import re

with open('src/app/cart/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add states for address modal
state_injection = '''  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: "", address1: "", address2: "", city: "", state: "", postalCode: "", phone: "", notes: "", isDefault: true });
  const [addressBusy, setAddressBusy] = useState(false);

  const saveNewAddress = async (e) => {
    e.preventDefault();
    setAddressBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("يجب تسجيل الدخول لإضافة عنوان.");
      
      const newLoc = { id: crypto.randomUUID(), ...addressForm };
      const updatedLocations = [...savedLocations.map(l => addressForm.isDefault ? {...l, isDefault: false} : l), newLoc];
      
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ location: updatedLocations })
      });
      
      if (!res.ok) throw new Error("فشل حفظ العنوان.");
      
      setSavedLocations(updatedLocations);
      setShowAddressModal(false);
      setFormData(prev => ({
        ...prev,
        phone: newLoc.phone || prev.phone,
        city: newLoc.city || prev.city,
        address: [newLoc.address1, newLoc.address2].filter(Boolean).join(", "),
      }));
    } catch (err) {
      alert(err.message);
    } finally {
      setAddressBusy(false);
    }
  };
'''
content = content.replace('const [savedLocations, setSavedLocations] = useState([]);', 'const [savedLocations, setSavedLocations] = useState([]);\n' + state_injection)

# Add the Add Address button
old_select_block = '''<select style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} defaultValue="" onChange={selectSavedLocation}>
                        <option value="">{locale === "ar" ? "اختر من العناوين المحفوظة" : "Choose saved address"}</option>
                        {savedLocations.map((location) => <option key={location.id} value={location.id}>{location.label} - {location.address1}</option>)}
                      </select>'''

new_select_block = '''<select style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} defaultValue="" onChange={selectSavedLocation}>
                        <option value="">{locale === "ar" ? "اختر من العناوين المحفوظة" : "Choose saved address"}</option>
                        {savedLocations.map((location) => <option key={location.id} value={location.id}>{location.label} - {location.address1}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowAddressModal(true)} style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: 'var(--blue)', color: 'white', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {locale === "ar" ? "إضافة عنوان" : "Add Address"}
                      </button>'''

content = content.replace(old_select_block, new_select_block)

# Add the modal at the end of main
modal_html = '''
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }}>
          <form onSubmit={saveNewAddress} style={{ background: 'var(--panel)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '500px', display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{locale === "ar" ? "إضافة عنوان جديد" : "Add New Address"}</h2>
              <button type="button" onClick={() => setShowAddressModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "اسم العنوان" : "Address Label"}
                <input style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} value={addressForm.label} onChange={(e) => setAddressForm({...addressForm, label: e.target.value})} placeholder={locale === "ar" ? "مثال: المنزل" : "e.g. Home"} required />
              </label>
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "رقم الهاتف" : "Phone Number"}
                <input style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} type="tel" value={addressForm.phone} onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})} required />
              </label>
            </div>
            
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "العنوان الأول" : "Address Line 1"}
              <input style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} value={addressForm.address1} onChange={(e) => setAddressForm({...addressForm, address1: e.target.value})} required placeholder={locale === "ar" ? "رقم المبنى واسم الشارع" : "Building number and street"} />
            </label>
            
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "العنوان الثاني" : "Address Line 2"}
              <input style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} value={addressForm.address2} onChange={(e) => setAddressForm({...addressForm, address2: e.target.value})} placeholder={locale === "ar" ? "الشقة، الدور، العلامة المميزة" : "Apartment, floor, landmark"} />
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "المدينة" : "City"}
                <input style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} value={addressForm.city} onChange={(e) => setAddressForm({...addressForm, city: e.target.value})} required />
              </label>
              <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 'bold' }}>{locale === "ar" ? "المحافظة" : "State"}
                <input style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} value={addressForm.state} onChange={(e) => setAddressForm({...addressForm, state: e.target.value})} />
              </label>
            </div>
            
            <button type="submit" disabled={addressBusy} style={{ padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--blue)', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}>
              {addressBusy ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : (locale === "ar" ? "حفظ العنوان" : "Save Address")}
            </button>
          </form>
        </div>
      )}
    </main>
'''

content = content.replace('</main>', modal_html)

with open('src/app/cart/page.js', 'w', encoding='utf-8') as f:
    f.write(content)
