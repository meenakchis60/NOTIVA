import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import authService from '../../api/authService';
import { User, Settings, Lock, Image as ImageIcon } from 'lucide-react';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({ queryKey: ['profile'], queryFn: () => authService.getProfile() });
  const profile = res?.data;

  const [formData, setFormData] = useState({ display_name: '', bio: '', theme_preference: 'SYSTEM' });
  const [pwData, setPwData] = useState({ old_password: '', new_password: '', new_password2: '' });

  useEffect(() => {
    if (profile) setFormData({ display_name: profile.display_name || '', bio: profile.bio || '', theme_preference: profile.theme_preference || 'SYSTEM' });
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: () => queryClient.invalidateQueries(['profile']),
  });

  const pwMut = useMutation({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => { alert('Password changed'); setPwData({ old_password: '', new_password: '', new_password2: '' }); },
  });

  const imgMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('profile_image', file);
      return authService.uploadProfileImage(fd);
    },
    onSuccess: () => queryClient.invalidateQueries(['profile'])
  });

  if (isLoading) return <p>Loading profile...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User /> Profile & Settings</h1>
      
      <div style={{ display: 'grid', gap: '2rem' }}>
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><ImageIcon size={20}/> Profile Image</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {profile?.profile_image ? (
              <img src={profile.profile_image} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={40} color="var(--color-text-muted)" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) imgMut.mutate(e.target.files[0]); }} />
          </div>
        </div>

        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Settings size={20}/> General Info</h2>
          <form onSubmit={e => { e.preventDefault(); updateMut.mutate(formData); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Display Name</label>
              <input value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Bio</label>
              <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} rows="3" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Theme Preference</label>
              <select value={formData.theme_preference} onChange={e => setFormData({...formData, theme_preference: e.target.value})}>
                <option value="LIGHT">Light</option>
                <option value="DARK">Dark</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={updateMut.isPending}>Save Changes</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Lock size={20}/> Security</h2>
          <form onSubmit={e => { e.preventDefault(); pwMut.mutate(pwData); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Old Password</label>
              <input type="password" required value={pwData.old_password} onChange={e => setPwData({...pwData, old_password: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>New Password</label>
              <input type="password" required value={pwData.new_password} onChange={e => setPwData({...pwData, new_password: e.target.value})} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Confirm New Password</label>
              <input type="password" required value={pwData.new_password2} onChange={e => setPwData({...pwData, new_password2: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={pwMut.isPending}>Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}