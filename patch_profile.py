import sys

with open("src/app/account/page.js", "r", encoding="utf-8") as f:
    content = f.read()

start_marker = '          {step === "signed-in" && ('
end_marker = '          {status && <div className={styles.status}>{status}</div>}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    sys.exit(1)

new_ui = """\
          {step === "signed-in" && (
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', background: 'var(--panel)', padding: '32px', borderRadius: '24px', border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: '24px', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '24px', color: 'var(--text)' }}>{profile?.name || text("حسابي", "My account")}</h2>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{profile?.email || email}</p>
                </div>
                <button type="button" onClick={() => supabase.auth.signOut().then(() => { setStatus(""); setStep("email"); })} style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                  {text("تسجيل الخروج", "Sign out")}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px', flex: 1 }}>
                  {profileTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProfileTab(tab.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'start',
                        background: profileTab === tab.id ? '#0070f3' : 'var(--input-bg)',
                        color: profileTab === tab.id ? '#fff' : 'var(--text)',
                        boxShadow: profileTab === tab.id ? '0 4px 12px rgba(0, 112, 243, 0.3)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '15px' }}>{tab.label}</strong>
                        <small style={{ color: profileTab === tab.id ? 'rgba(255,255,255,0.8)' : 'var(--muted)', marginTop: '2px', fontSize: '12px' }}>{tab.description}</small>
                      </div>
                    </button>
                  ))}
                </nav>

                <div style={{ flex: 3, minWidth: '280px', background: 'var(--input-bg)', borderRadius: '16px', padding: '24px', border: '1px solid var(--line)' }}>
                  {profileTab === "name" && (
                    <form onSubmit={saveName} style={{ display: 'grid', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{text("تحديث الاسم", "Update Name")}</h3>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("الاسم", "Name")}
                        <input value={profileName} onChange={(e) => setProfileName(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <button disabled={busy} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                        {busy ? text("جارٍ الحفظ...", "Saving...") : text("حفظ التغييرات", "Save changes")}
                      </button>
                    </form>
                  )}

                  {profileTab === "email" && (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{text("البريد الإلكتروني", "Email")}</h3>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("البريد الحالي", "Current Email")}
                        <input value={profile?.email || email} readOnly type="email" style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', fontSize: '15px', color: 'var(--text)', opacity: 0.7 }} />
                      </label>
                    </div>
                  )}

                  {profileTab === "password" && (
                    <form onSubmit={savePassword} style={{ display: 'grid', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{text("تحديث كلمة المرور", "Update Password")}</h3>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("كلمة المرور الحالية", "Current Password")}
                        <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("كلمة المرور الجديدة", "New Password")}
                        <input type="password" minLength="8" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--muted)' }}>
                        {text("تأكيد كلمة المرور", "Confirm Password")}
                        <input type="password" minLength="8" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--panel)', outline: 'none', fontSize: '15px', color: 'var(--text)', borderBottom: '2px solid var(--line)' }} />
                      </label>
                      <button disabled={busy} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                        {busy ? text("جارٍ الحفظ...", "Saving...") : text("تحديث كلمة المرور", "Update password")}
                      </button>
                    </form>
                  )}

                  {profileTab === "location" && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>{text("عناوين التوصيل", "Delivery Addresses")}</h3>
                        <button type="button" disabled={Array.isArray(profile?.location) && profile.location.length >= MAX_LOCATIONS && !showLocationForm} onClick={startNewLocation} style={{ background: 'none', border: 'none', color: '#0070f3', fontWeight: 'bold', cursor: 'pointer' }}>
                          {text("+ إضافة عنوان", "+ Add address")}
                        </button>
                      </div>

                      {Array.isArray(profile?.location) && profile.location.length > 0 && !showLocationForm && (
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {profile.location.map((location) => (
                            <article key={location.id} style={{ background: 'var(--panel)', border: location.isDefault ? '2px solid #0070f3' : '1px solid var(--line)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <strong style={{ fontSize: '16px', color: location.isDefault ? '#0070f3' : 'var(--text)' }}>{location.label || text("عنوان", "Address")}</strong>
                                  {location.isDefault && <span style={{ marginLeft: '8px', marginRight: '8px', background: 'rgba(0,112,243,0.1)', color: '#0070f3', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{text("أساسي", "Default")}</span>}
                                </div>
                                <button type="button" onClick={() => editLocation(location)} style={{ background: 'var(--input-bg)', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: 'var(--text)' }}>
                                  {text("تعديل", "Edit")}
                                </button>
                              </div>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{[location.address1, location.address2].filter(Boolean).join(", ")}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{[location.city, location.state].filter(Boolean).join(" - ")}</p>
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>{location.phone}</p>
                            </article>
                          ))}
                        </div>
                      )}

                      {showLocationForm && (
                        <form onSubmit={saveLocation} style={{ display: 'grid', gap: '16px', background: 'var(--panel)', padding: '24px', borderRadius: '16px', border: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px' }}>{locationForm.id ? text("تعديل العنوان", "Edit address") : text("عنوان جديد", "New address")}</h4>
                            <button type="button" onClick={() => setShowLocationForm(false)} style={{ background: 'none', border: 'none', fontSize: '14px', color: 'var(--muted)', cursor: 'pointer' }}>{text("إلغاء", "Cancel")}</button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("اسم العنوان", "Address label")}
                              <input value={locationForm.label} onChange={(e) => setLocationForm({ ...locationForm, label: e.target.value })} placeholder={text("مثال: المنزل", "e.g. Home")} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("رقم الهاتف", "Phone number")}
                              <input type="tel" value={locationForm.phone} onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                          </div>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("العنوان الأول", "Address line 1")}
                            <input value={locationForm.address1} onChange={(e) => setLocationForm({ ...locationForm, address1: e.target.value })} required placeholder={text("رقم المبنى والشارع", "Building and street")} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("العنوان الثاني", "Address line 2")}
                            <input value={locationForm.address2} onChange={(e) => setLocationForm({ ...locationForm, address2: e.target.value })} placeholder={text("شقة، دور...", "Apt, floor...")} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} />
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المدينة", "City")}
                              <input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} required style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>{text("المحافظة", "State")}
                              <input value={locationForm.state} onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })} style={{ padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--input-bg)', outline: 'none', fontSize: '14px', color: 'var(--text)' }} />
                            </label>
                          </div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}>
                            <input type="checkbox" checked={locationForm.isDefault} onChange={(e) => setLocationForm({ ...locationForm, isDefault: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#0070f3' }} /> 
                            {text("استخدام كعنوان أساسي", "Set as default")}
                          </label>
                          <button disabled={busy} style={{ background: '#0070f3', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                            {busy ? text("جارٍ الحفظ...", "Saving...") : locationForm.id ? text("تحديث", "Update") : text("حفظ", "Save")}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
"""

new_content = content[:start_idx] + new_ui + content[end_idx:]

with open("src/app/account/page.js", "w", encoding="utf-8") as f:
    f.write(new_content)
