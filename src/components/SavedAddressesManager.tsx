import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trash2, Star, Edit, Plus, X } from 'lucide-react';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { Tables } from '@/integrations/supabase/types';
import { logActivity } from '@/hooks/useActivityLogs';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SavedAddress = Tables<'saved_addresses'>;

export const SavedAddressesManager = () => {
  const {
    addresses,
    isLoading,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    isCreating,
    isDeleting,
  } = useSavedAddresses();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    label: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: '',
  });

  const handleEdit = (address: SavedAddress) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      street: address.street,
      number: address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state || '',
      cep: address.cep,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormData({
      label: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      cep: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingAddress) {
      // Log address update
      await logActivity('address_updated', {
        beforeData: {
          label: editingAddress.label,
          street: editingAddress.street,
          cep: editingAddress.cep,
        },
        afterData: formData,
        resourceType: 'saved_address',
        resourceId: editingAddress.id,
        severity: 'info',
      });

      updateAddress({
        id: editingAddress.id,
        updates: {
          label: formData.label,
          street: formData.street,
          number: formData.number,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state || undefined,
          cep: formData.cep,
        },
      });
    } else {
      // Log new address creation
      await logActivity('address_added', {
        afterData: formData,
        resourceType: 'saved_address',
        severity: 'info',
      });

      createAddress({
        label: formData.label,
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state || undefined,
        cep: formData.cep,
        is_default: addresses.length === 0, // Primeiro endereço é padrão automaticamente
      });
    }

    handleCancel();
  };

  const handleDelete = async () => {
    if (addressToDelete) {
      const addressToDeleteData = addresses.find(a => a.id === addressToDelete);
      
      // Log address deletion
      if (addressToDeleteData) {
        await logActivity('address_deleted', {
          beforeData: {
            label: addressToDeleteData.label,
            street: addressToDeleteData.street,
            cep: addressToDeleteData.cep,
          },
          resourceType: 'saved_address',
          resourceId: addressToDelete,
          severity: 'warning',
        });
      }

      deleteAddress(addressToDelete);
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Carregando endereços...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereços Salvos
            </CardTitle>
            <CardDescription>
              Gerencie seus endereços de entrega
            </CardDescription>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Endereço
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">
                {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label htmlFor="label">Nome do endereço *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ex: Casa, Trabalho"
                required
                maxLength={50}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cep">CEP *</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                  placeholder="00000-000"
                  required
                  maxLength={9}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="street">Rua *</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                  placeholder="Nome da rua"
                  required
                  maxLength={100}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  placeholder="000"
                  required
                  maxLength={20}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                  placeholder="Nome do bairro"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Nome da cidade"
                required
                maxLength={100}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isCreating}>
                {editingAddress ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {addresses.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum endereço salvo. Adicione um endereço para facilitar seus próximos pedidos.
          </p>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{address.label}</h4>
                    {address.is_default && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {address.street}, {address.number}
                    <br />
                    {address.neighborhood} - {address.city}
                    {address.state && `, ${address.state}`}
                    <br />
                    CEP: {address.cep}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!address.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultAddress(address.id)}
                      title="Definir como padrão"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(address)}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddressToDelete(address.id);
                      setDeleteDialogOpen(true);
                    }}
                    title="Excluir"
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Endereço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este endereço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
