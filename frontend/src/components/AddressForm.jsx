import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveAddress } from '../store/accountSlice';

const STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'];

const blank = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', landmark: '', is_default: false };

export default function AddressForm({ initial, onDone, onCancel }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const { saving, error } = useSelector((s) => s.account);
  const [f, setF] = useState({ ...blank, phone: user?.mobile || '', full_name: user?.name || '', ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const res = await dispatch(saveAddress({ ...f, line2: f.line2 || null, landmark: f.landmark || null }));
    if (!res.error) onDone?.(res.payload);
  };

  return (
    <form className="address-form" onSubmit={submit}>
      <div className="grid-2">
        <label>Full name<input required name="full_name" value={f.full_name} onChange={set('full_name')} /></label>
        <label>Mobile<input required inputMode="numeric" name="phone" value={f.phone} onChange={set('phone')} placeholder="10-digit mobile" /></label>
      </div>
      <label>House / flat, street<input required name="line1" value={f.line1} onChange={set('line1')} /></label>
      <label>Area, locality (optional)<input name="line2" value={f.line2 || ''} onChange={set('line2')} /></label>
      <div className="grid-3">
        <label>City<input required name="city" value={f.city} onChange={set('city')} /></label>
        <label>State
          <select required name="state" value={f.state} onChange={set('state')}>
            <option value="">Select</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label>PIN code<input required inputMode="numeric" maxLength={6} name="pincode" value={f.pincode} onChange={set('pincode')} /></label>
      </div>
      <label>Landmark (optional)<input name="landmark" value={f.landmark || ''} onChange={set('landmark')} /></label>
      <label className="check"><input type="checkbox" checked={f.is_default} onChange={set('is_default')} /> Make this my default address</label>
      {error && <p className="error">{error}</p>}
      <div className="row gap">
        <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save address'}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

export function AddressText({ a }) {
  return (
    <div className="address-text">
      <strong>{a.full_name}</strong> · {a.phone}<br />
      {a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />
      {a.city}, {a.state} {a.pincode}{a.landmark ? ` · Near ${a.landmark}` : ''}
    </div>
  );
}
