
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Supplier } from '../../types';

interface FornecedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: any) => void;
  supplier?: Supplier | null;
}

const FornecedorModal: React.FC<FornecedorModalProps> = ({ isOpen, onClose, onSave, supplier }) => {
  const [formData, setFormData] = useState({
    nome: '',
    cidade: '',
    contato: ''
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        nome: supplier.nome,
        cidade: supplier.cidade,
        contato: supplier.contato || ''
      });
    } else {
      setFormData({
        nome: '',
        cidade: '',
        contato: ''
      });
    }
  }, [supplier, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome Fornecedor *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="cidade">Cidade *</Label>
            <Input
              id="cidade"
              value={formData.cidade}
              onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="contato">Contato (opcional)</Label>
            <Input
              id="contato"
              value={formData.contato}
              onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
              placeholder="Telefone, e-mail ou responsável"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-vertttraue-primary hover:bg-vertttraue-primary-light">
              {supplier ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FornecedorModal;
