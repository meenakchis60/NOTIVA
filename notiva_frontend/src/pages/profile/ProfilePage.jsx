import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import authService from '../../api/authService';
import { User, Settings, Lock, Image as ImageIcon, Loader2, Save, Upload } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: res, isLoading } = useQuery({ queryKey: ['profile'], queryFn: () => authService.getProfile() });
  const profile = res?.data;

  const [formData, setFormData] = useState({ display_name: '', bio: '', theme_preference: 'SYSTEM' });
  const [pwData, setPwData] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (profile) setFormData({ display_name: profile.display_name || '', bio: profile.bio || '', theme_preference: profile.theme_preference || 'SYSTEM' });
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      setMsg('Profile updated successfully.');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  const pwMut = useMutation({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => { 
      setMsg('Password changed successfully.'); 
      setPwData({ old_password: '', new_password: '', new_password2: '' }); 
      setTimeout(() => setMsg(''), 3000);
    },
    onError: (err) => {
      setMsg(err.response?.data?.detail || 'Failed to change password.');
    }
  });

  const imgMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('profile_image', file);
      return authService.uploadProfileImage(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      setMsg('Profile image updated.');
      setTimeout(() => setMsg(''), 3000);
    }
  });

  if (isLoading) return (
    <div className="empty-state">
      <Loader2 className="loading-spinner mb-4" />
      <h3 className="font-semibold">Loading profile...</h3>
    </div>
  );

  return (
    <div className="flex-col w-full" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3"><User size={32} className="text-primary" /> Profile Settings</h1>
          <p className="text-muted mt-4">Manage your account settings, profile image, and preferences.</p>
        </div>
      </div>
      
      {msg && (
        <div className="p-4 mb-6 rounded-lg bg-surface border font-medium text-primary">
          {msg}
        </div>
      )}
      
      <div className="flex-col gap-6">
        <div className="card shadow-sm border rounded-lg overflow-hidden">
          <div className="p-4 bg-bg border-bottom font-semibold flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <ImageIcon size={20} className="text-primary"/> Profile Picture
          </div>
          <div className="p-6 flex flex-wrap items-center gap-6">
            {profile?.profile_image ? (
              <img src={profile.profile_image} alt="Profile" className="border shadow-sm" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="border shadow-sm" style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={48} className="text-muted" />
              </div>
            )}
            
            <div className="flex-col gap-2">
              <p className="font-medium">{user?.username}</p>
              <p className="text-muted text-sm">{user?.email}</p>
              <div className="mt-2 relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  id="profile-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ position: 'absolute', opacity: 0, cursor: 'pointer', inset: 0, zIndex: 10 }}
                  onChange={(e) => { if (e.target.files[0]) imgMut.mutate(e.target.files[0]); }} 
                />
                <button type="button" className="btn-secondary flex items-center gap-2 relative pointer-events-none">
                  {imgMut.isPending ? <Loader2 className="loading-spinner w-4 h-4" /> : <Upload size={16} />}
                  Upload New Image
                </button>
              </div>
              <p className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>JPEG or PNG. Max 2MB.</p>
            </div>
          </div>
        </div>

        <div className="card shadow-sm border rounded-lg overflow-hidden">
          <div className="p-4 bg-bg border-bottom font-semibold flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Settings size={20} className="text-primary"/> General Information
          </div>
          <form onSubmit={e => { e.preventDefault(); updateMut.mutate(formData); }} className="p-6 flex-col gap-4">
            <div className="grid grid-cols-1 md-grid-cols-2 gap-4">
              <div className="form-group flex-col gap-2">
                <label className="font-medium text-sm">Display Name</label>
                <input value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} placeholder="How you appear to others" />
              </div>
              <div className="form-group flex-col gap-2">
                <label className="font-medium text-sm">Theme Preference</label>
                <select value={formData.theme_preference} onChange={e => setFormData({...formData, theme_preference: e.target.value})}>
                  <option value="LIGHT">Light</option>
                  <option value="DARK">Dark</option>
                  <option value="SYSTEM">System Default</option>
                </select>
              </div>
            </div>
            
            <div className="form-group flex-col gap-2">
              <label className="font-medium text-sm">Bio</label>
              <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} rows="4" placeholder="Tell your peers a bit about yourself..." />
            </div>
            
            <div className="flex justify-end mt-2">
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={updateMut.isPending}>
                {updateMut.isPending ? <Loader2 className="loading-spinner w-4 h-4" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <div className="card shadow-sm border rounded-lg overflow-hidden">
          <div className="p-4 bg-bg border-bottom font-semibold flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Lock size={20} className="text-primary"/> Security
          </div>
          <form onSubmit={e => { e.preventDefault(); pwMut.mutate(pwData); }} className="p-6 flex-col gap-4">
            <div className="form-group flex-col gap-2">
              <label className="font-medium text-sm">Current Password</label>
              <input type="password" required value={pwData.old_password} onChange={e => setPwData({...pwData, old_password: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md-grid-cols-2 gap-4">
              <div className="form-group flex-col gap-2">
                <label className="font-medium text-sm">New Password</label>
                <input type="password" required value={pwData.new_password} onChange={e => setPwData({...pwData, new_password: e.target.value})} />
              </div>
              <div className="form-group flex-col gap-2">
                <label className="font-medium text-sm">Confirm New Password</label>
                <input type="password" required value={pwData.new_password2} onChange={e => setPwData({...pwData, new_password2: e.target.value})} />
              </div>
            </div>
            
            <div className="flex justify-end mt-2">
              <button type="submit" className="btn-secondary flex items-center gap-2" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} disabled={pwMut.isPending || !pwData.old_password}>
                {pwMut.isPending ? <Loader2 className="loading-spinner w-4 h-4" /> : <Lock size={16} />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}