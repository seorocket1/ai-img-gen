import React, { useState, useEffect } from 'react';
import { X, Users, CreditCard, Plus, Minus, Search, Calendar, Image as ImageIcon, Download } from 'lucide-react';
import { getAllUsers, updateUserCredits, getAllImageGenerations, User, ImageGeneration } from '../lib/supabase';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [imageGenerations, setImageGenerations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'images'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creditModalUser, setCreditModalUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, imagesData] = await Promise.all([
        getAllUsers(),
        getAllImageGenerations(),
      ]);
      setUsers(usersData);
      setImageGenerations(imagesData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
    setIsLoading(false);
  };

  const handleUpdateCredits = async (userId: string, newCredits: number) => {
    try {
      await updateUserCredits(userId, newCredits);
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, credits: newCredits } : user
      ));
      setCreditModalUser(null);
      setCreditAmount('');
    } catch (error) {
      console.error('Error updating credits:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredImages = imageGenerations.filter(img =>
    img.users?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.users?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 mr-4">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Admin Panel</h2>
              <p className="text-purple-100">Manage users and monitor system activity</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4 mr-2 inline" />
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-6 py-4 font-medium text-sm transition-colors ${
                activeTab === 'images'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ImageIcon className="w-4 h-4 mr-2 inline" />
              Image Generations ({imageGenerations.length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={activeTab === 'users' ? 'Search users...' : 'Search image generations...'}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        {user.is_admin && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>Email: {user.email}</div>
                        <div>User ID: {user.user_id}</div>
                        {user.brand_name && <div>Brand: {user.brand_name}</div>}
                        {user.website_url && <div>Website: {user.website_url}</div>}
                        <div>Joined: {new Date(user.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{user.credits}</div>
                        <div className="text-xs text-gray-500">Credits</div>
                      </div>
                      <button
                        onClick={() => setCreditModalUser(user)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <CreditCard className="w-4 h-4 mr-2 inline" />
                        Manage Credits
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredImages.map((img) => (
                <div key={img.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start space-x-4">
                    <img
                      src={`data:image/png;base64,${img.image_data}`}
                      alt={img.title || 'Generated image'}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {img.title || `${img.image_type} Image`}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          img.image_type === 'blog' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {img.image_type}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                        <div>User: {img.users?.name} ({img.users?.email})</div>
                        <div>Credits Used: {img.credits_used}</div>
                        <div>Created: {new Date(img.created_at).toLocaleDateString()}</div>
                        {img.style && <div>Style: {img.style}</div>}
                        {img.colour && <div>Colour: {img.colour}</div>}
                      </div>
                      {img.content && (
                        <p className="text-sm text-gray-600 line-clamp-2">{img.content}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // Download image
                        const link = document.createElement('a');
                        link.href = `data:image/png;base64,${img.image_data}`;
                        link.download = `${img.title || 'image'}-${img.id}.png`;
                        link.click();
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Credit Management Modal */}
      {creditModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Manage Credits for {creditModalUser.name}
              </h3>
              <div className="mb-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{creditModalUser.credits}</div>
                  <div className="text-sm text-gray-500">Current Credits</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Set New Credit Amount
                  </label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter new credit amount"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const amount = parseInt(creditAmount);
                      if (!isNaN(amount) && amount >= 0) {
                        handleUpdateCredits(creditModalUser.id, amount);
                      }
                    }}
                    disabled={!creditAmount || isNaN(parseInt(creditAmount))}
                    className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Update Credits
                  </button>
                  <button
                    onClick={() => {
                      setCreditModalUser(null);
                      setCreditAmount('');
                    }}
                    className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};