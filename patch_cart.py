import re

with open('src/app/cart/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add tipAmount and branchLocation to formData initial state
content = content.replace('discountCode: "",', 'discountCode: "",\n    tipAmount: "",\n    branchLocation: "",')

# We need to change the aside className="cart-summary-card" block
start_idx = content.find('<aside className="cart-summary-card">')
end_idx = content.find('</aside>') + 8
old_aside = content[start_idx:end_idx]

new_aside = '''<aside className="cart-summary-card">
            <div className="cart-summary-top">
              <span>{locale === "ar" ? "جاهز لإتمام الطلب" : "Ready to check out"}</span>
              <strong>{locale === "ar" ? `إجمالي الطلب (${cartCount} قطعة)` : `Total Order (${cartCount} items)`}</strong>
              <b>{formatMoney(grandTotal + (Number(formData.tipAmount) || 0))}</b>
            </div>

            <div className="cart-delivery-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '16px' }}>
              <button 
                type="button" 
                style={{ flex: 1, background: 'none', border: 'none', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', borderBottom: formData.deliveryMethod !== "pickup" ? '2px solid var(--blue)' : '2px solid transparent', color: formData.deliveryMethod !== "pickup" ? 'var(--blue)' : 'var(--muted)' }}
                onClick={() => setFormData({...formData, deliveryMethod: "delivery"})}
              >
                {locale === "ar" ? "التوصيل الى المنزل" : "Home Delivery"}
              </button>
              <button 
                type="button" 
                style={{ flex: 1, background: 'none', border: 'none', padding: '12px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', borderBottom: formData.deliveryMethod === "pickup" ? '2px solid var(--blue)' : '2px solid transparent', color: formData.deliveryMethod === "pickup" ? 'var(--blue)' : 'var(--muted)' }}
                onClick={() => setFormData({...formData, deliveryMethod: "pickup"})}
              >
                {locale === "ar" ? "الاستلام من الفرع" : "Branch Pickup"}
              </button>
            </div>

            <div className="cart-checkout-form">
              {formData.deliveryMethod !== "pickup" ? (
                <div className="cart-form-grid">
                  {/* Home Delivery Form */}
                  <label className="cart-span-full">
                    {locale === "ar" ? "اختر عنواناً" : "Select Address"}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }} defaultValue="" onChange={selectSavedLocation}>
                        <option value="">{locale === "ar" ? "اختر من العناوين المحفوظة" : "Choose saved address"}</option>
                        {savedLocations.map((location) => <option key={location.id} value={location.id}>{location.label} - {location.address1}</option>)}
                      </select>
                    </div>
                  </label>
                  <label>
                    {locale === "ar" ? "الاسم" : "Name"}
                    <input name="name" type="text" value={formData.name} onChange={handleInputChange} required />
                  </label>
                  <label>
                    {locale === "ar" ? "رقم الموبايل" : "Phone"}
                    <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
                  </label>
                  <label className="cart-span-full">
                    {locale === "ar" ? "العنوان بالتفصيل" : "Full Address"}
                    <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} required placeholder={locale === "ar" ? "أدخل عنوانك بالتفصيل هنا أو اختر من الأعلى" : "Enter your full address here or select above"}></textarea>
                  </label>

                  <div className="cart-span-full payment-method-cards">
                    <label style={{ marginBottom: '8px', display: 'block' }}>{locale === "ar" ? "طريقة الدفع" : "Payment Method"}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div 
                        style={{ padding: '16px', background: 'var(--panel)', border: formData.paymentMethod === 'cash' ? '2px solid var(--blue)' : '1px solid var(--line)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                        onClick={() => setFormData({...formData, paymentMethod: 'cash'})}
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{locale === "ar" ? "كاش" : "Cash"}</span>
                      </div>
                      <div 
                        style={{ padding: '16px', background: 'var(--panel)', border: formData.paymentMethod === 'online' ? '2px solid var(--blue)' : '1px solid var(--line)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
                        onClick={() => setFormData({...formData, paymentMethod: 'online'})}
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{locale === "ar" ? "دفع إلكتروني" : "Online"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <label className="cart-span-full voucher-input-wrapper">
                    {locale === "ar" ? "كوبون خصم" : "Discount Coupon"}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                      <input
                        style={{ flex: 1, border: 'none', background: 'transparent', padding: '12px', outline: 'none', color: 'var(--text)' }}
                        name="discountCode"
                        type="text"
                        placeholder={locale === "ar" ? "أدخل كود الخصم" : "Enter discount code"}
                        value={formData.discountCode}
                        onChange={(e) => {
                          handleInputChange(e);
                          setCouponCode(e.target.value);
                        }}
                      />
                    </div>
                  </label>

                  <label className="cart-span-full">
                    {locale === "ar" ? "إكرامية (اختياري)" : "Tip (Optional)"}
                    <input name="tipAmount" type="number" min="0" placeholder={locale === "ar" ? "مثال: 50" : "e.g. 50"} value={formData.tipAmount} onChange={handleInputChange} />
                  </label>
                </div>
              ) : (
                <div className="cart-form-grid">
                  {/* Branch Pickup Form */}
                  <label className="cart-span-full">
                    {locale === "ar" ? "الفرع" : "Branch Location"}
                    <div style={{ padding: '16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                       <strong style={{ display: 'block', fontSize: '15px' }}>Cover Up Main Branch</strong>
                       <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>123 Main St, Cairo, Egypt</p>
                    </div>
                  </label>
                  
                  <label className="cart-span-full">
                    {locale === "ar" ? "الاسم" : "Name"}
                    <input name="name" type="text" value={formData.name} onChange={handleInputChange} required />
                  </label>
                  <label className="cart-span-full">
                    {locale === "ar" ? "رقم الموبايل" : "Phone"}
                    <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
                  </label>
                  
                  <div className="cart-span-full">
                    <label style={{ marginBottom: '8px', display: 'block' }}>{locale === "ar" ? "طريقة الدفع" : "Payment Method"}</label>
                    <div style={{ padding: '16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                       {locale === "ar" ? "الدفع عند الاستلام في الفرع" : "Pay at the branch upon pickup"}
                    </div>
                  </div>

                  <label className="cart-span-full voucher-input-wrapper">
                    {locale === "ar" ? "كوبون خصم" : "Discount Coupon"}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                      <input
                        style={{ flex: 1, border: 'none', background: 'transparent', padding: '12px', outline: 'none', color: 'var(--text)' }}
                        name="discountCode"
                        type="text"
                        placeholder={locale === "ar" ? "أدخل كود الخصم" : "Enter discount code"}
                        value={formData.discountCode}
                        onChange={(e) => {
                          handleInputChange(e);
                          setCouponCode(e.target.value);
                        }}
                      />
                    </div>
                  </label>

                  <label className="cart-span-full">
                    {locale === "ar" ? "إكرامية (اختياري)" : "Tip (Optional)"}
                    <input name="tipAmount" type="number" min="0" placeholder={locale === "ar" ? "مثال: 50" : "e.g. 50"} value={formData.tipAmount} onChange={handleInputChange} />
                  </label>
                </div>
              )}
            </div>

            <div className="cart-pricing-box">
              <div>
                <span>{locale === "ar" ? "إجمالي المنتجات" : "Subtotal"}</span>
                <b>{formatMoney(subtotal)}</b>
              </div>
              {discountAmount > 0 && (
                <div>
                  <span>{locale === "ar" ? "الخصم" : "Discount"}</span>
                  <b style={{ color: "#4caf50" }}>-{formatMoney(discountAmount)}</b>
                </div>
              )}
              {formData.deliveryMethod !== "pickup" && (
                <div>
                  <span>{locale === "ar" ? "رسوم التوصيل" : "Delivery Fee"}</span>
                  <b>{formatMoney(deliveryFee)}</b>
                </div>
              )}
              {Number(formData.tipAmount) > 0 && (
                <div>
                  <span>{locale === "ar" ? "إكرامية" : "Tip"}</span>
                  <b>{formatMoney(Number(formData.tipAmount))}</b>
                </div>
              )}
              <div className="is-total">
                <span>{locale === "ar" ? "الإجمالي النهائي" : "Grand Total"}</span>
                <b>{formatMoney(grandTotal + (Number(formData.tipAmount) || 0))}</b>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {formData.deliveryMethod === "pickup" ? (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={loading}
                  onClick={() => handleCheckout("cash")}
                >
                  {locale === "ar" ? "إكمال الطلب" : "Complete Order"}
                </button>
              ) : formData.paymentMethod === "online" ? (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={loading}
                  onClick={() => handleCheckout("online")}
                >
                  {locale === "ar" ? "الاستمرار للدفع" : "Continue to paying"}
                </button>
              ) : (
                <button
                  className="button button-primary"
                  type="button"
                  disabled={loading}
                  onClick={() => handleCheckout("cash")}
                >
                  {locale === "ar" ? "إكمال الطلب" : "Complete Order"}
                </button>
              )}
            </div>
            
            {message && (
              <div
                className="payment-message"
                style={{ marginTop: "16px", padding: "16px", borderRadius: "12px", background: "var(--panel)", border: "1px solid var(--line)", textAlign: "center" }}
              >
                <p style={{ margin: 0, fontSize: "15px", color: message.includes("تم") || message.includes("successfully") ? "#4caf50" : "#ff8f3d", fontWeight: "bold" }} dangerouslySetInnerHTML={{ __html: message }}></p>
              </div>
            )}
          </aside>'''

content = content.replace(old_aside, new_aside)

with open('src/app/cart/page.js', 'w', encoding='utf-8') as f:
    f.write(content)
