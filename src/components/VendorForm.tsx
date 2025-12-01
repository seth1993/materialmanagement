'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Vendor, CreateVendorRequest, VendorContact, VendorTerms } from '@/types/vendor';

interface VendorFormProps {
  vendor?: Vendor;
  onSave?: (vendor: Vendor) => void;
  onCancel?: () => void;
}

export default function VendorForm({ vendor, onSave, onCancel }: VendorFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateVendorRequest>({
    name: '',
    code: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    website: '',
    taxId: '',
    contacts: [{
      name: '',
      email: '',
      phone: '',
      role: 'Primary Contact',
      isPrimary: true,
    }],
    terms: {
      paymentTerms: 'Net 30',
      shippingTerms: 'FOB Origin',
      currency: 'USD',
      minimumOrderValue: undefined,
      discountTerms: '',
    },
    defaultLeadTimeDays: 7,
  });

  // Initialize form with vendor data if editing
  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        code: vendor.code,
        description: vendor.description || '',
        address: vendor.address,
        website: vendor.website || '',
        taxId: vendor.taxId || '',
        contacts: vendor.contacts.map(contact => ({
          name: contact.name,
          email: contact.email,
          phone: contact.phone || '',
          role: contact.role,
          isPrimary: contact.isPrimary,
        })),
        terms: vendor.terms,
        defaultLeadTimeDays: vendor.defaultLeadTimeDays,
      });
    }
  }, [vendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to save vendors');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const url = vendor ? `/api/vendors/${vendor.id}` : '/api/vendors';
      const method = vendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save vendor');
      }

      const data = await response.json();
      
      if (vendor && onSave) {
        // For updates, fetch the updated vendor
        const updatedResponse = await fetch(`/api/vendors/${vendor.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          onSave(updatedData.vendor);
        }
      } else {
        // For new vendors, redirect to vendor list
        window.location.href = '/vendors';
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      setError(error instanceof Error ? error.message : 'Failed to save vendor');
    } finally {
      setLoading(false);
    }
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        {
          name: '',
          email: '',
          phone: '',
          role: 'Contact',
          isPrimary: false,
        }
      ]
    }));
  };

  const removeContact = (index: number) => {
    if (formData.contacts.length <= 1) {
      setError('At least one contact is required');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const updateContact = (index: number, field: keyof VendorContact, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const setPrimaryContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => ({
        ...contact,
        isPrimary: i === index
      }))
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Vendor Code *
                </label>
                <input
                  type="text"
                  id="code"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="street"
                    required
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    required
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State/Province *
                  </label>
                  <input
                    type="text"
                    id="state"
                    required
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                    ZIP/Postal Code *
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    required
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, zipCode: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                    Country *
                  </label>
                  <input
                    type="text"
                    id="country"
                    required
                    value={formData.address.country}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, country: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700">
                  Tax ID
                </label>
                <input
                  type="text"
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Contacts */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Add Contact
                </button>
              </div>

              {formData.contacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-md font-medium text-gray-800">
                      Contact {index + 1}
                      {contact.isPrimary && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Primary
                        </span>
                      )}
                    </h4>
                    <div className="flex space-x-2">
                      {!contact.isPrimary && (
                        <button
                          type="button"
                          onClick={() => setPrimaryContact(index)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Set as Primary
                        </button>
                      )}
                      {formData.contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={contact.name}
                        onChange={(e) => updateContact(index, 'name', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={contact.email}
                        onChange={(e) => updateContact(index, 'email', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={contact.phone || ''}
                        onChange={(e) => updateContact(index, 'phone', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Role *
                      </label>
                      <input
                        type="text"
                        required
                        value={contact.role}
                        onChange={(e) => updateContact(index, 'role', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Terms */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Terms</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700">
                    Payment Terms *
                  </label>
                  <select
                    id="paymentTerms"
                    required
                    value={formData.terms.paymentTerms}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      terms: { ...prev.terms, paymentTerms: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="2/10 Net 30">2/10 Net 30</option>
                    <option value="COD">COD</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="shippingTerms" className="block text-sm font-medium text-gray-700">
                    Shipping Terms *
                  </label>
                  <select
                    id="shippingTerms"
                    required
                    value={formData.terms.shippingTerms}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      terms: { ...prev.terms, shippingTerms: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FOB Origin">FOB Origin</option>
                    <option value="FOB Destination">FOB Destination</option>
                    <option value="CIF">CIF</option>
                    <option value="DDP">DDP</option>
                    <option value="EXW">EXW</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                    Currency *
                  </label>
                  <select
                    id="currency"
                    required
                    value={formData.terms.currency}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      terms: { ...prev.terms, currency: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="CAD">CAD</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="defaultLeadTimeDays" className="block text-sm font-medium text-gray-700">
                    Default Lead Time (Days) *
                  </label>
                  <input
                    type="number"
                    id="defaultLeadTimeDays"
                    required
                    min="0"
                    value={formData.defaultLeadTimeDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultLeadTimeDays: parseInt(e.target.value) || 0 }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="minimumOrderValue" className="block text-sm font-medium text-gray-700">
                    Minimum Order Value
                  </label>
                  <input
                    type="number"
                    id="minimumOrderValue"
                    min="0"
                    step="0.01"
                    value={formData.terms.minimumOrderValue || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      terms: { ...prev.terms, minimumOrderValue: e.target.value ? parseFloat(e.target.value) : undefined }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="discountTerms" className="block text-sm font-medium text-gray-700">
                    Discount Terms
                  </label>
                  <input
                    type="text"
                    id="discountTerms"
                    value={formData.terms.discountTerms || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      terms: { ...prev.terms, discountTerms: e.target.value }
                    }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onCancel || (() => window.history.back())}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <LoadingSpinner size="sm" className="mr-2" />}
                {vendor ? 'Update Vendor' : 'Create Vendor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
