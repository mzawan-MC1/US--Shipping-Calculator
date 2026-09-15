import React, { useState } from 'react';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner, Skeleton } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';

import { MessageCircle } from 'lucide-react';

export const DesignSystemPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string>('card-1');

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <Container>
        <div className="mb-8 pb-4 border-b border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-orange-500">
            Internal Engineering Specification
          </span>
          <h1 className="text-3xl font-black text-brand-navy-950">
            Design System & Component Tokens
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Standardized UI primitives for Fakher Alam Used Cars Shipping.
          </p>
        </div>

        <div className="space-y-10">
          {/* Color Tokens */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Brand Color Hierarchy</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold">
              <div className="p-4 rounded-xl bg-brand-navy-950 text-white shadow-sm">
                Deep Navy (#071224)
                <span className="block text-[10px] font-normal text-slate-400 mt-1">
                  Primary Brand
                </span>
              </div>
              <div className="p-4 rounded-xl bg-brand-orange-500 text-white shadow-sm">
                Orange (#F97316)
                <span className="block text-[10px] font-normal text-white/80 mt-1">
                  Calculation CTAs
                </span>
              </div>
              <div className="p-4 rounded-xl bg-brand-whatsapp text-white shadow-sm">
                WhatsApp (#25D366)
                <span className="block text-[10px] font-normal text-white/80 mt-1">
                  WhatsApp CTAs
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-sm">
                White & Slate (#F8FAFC)
                <span className="block text-[10px] font-normal text-slate-500 mt-1">
                  Elevated Surfaces
                </span>
              </div>
            </div>
          </section>

          {/* Buttons */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Button Variants</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary Orange</Button>
              <Button variant="whatsapp" startIcon={<MessageCircle className="w-4 h-4" />}>
                WhatsApp Action
              </Button>
              <Button variant="secondary">Secondary Navy</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
            </div>
          </section>

          {/* Status Badges */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Status Badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Active / In Transit</Badge>
              <Badge variant="warning">Pending Review</Badge>
              <Badge variant="danger">Cancelled</Badge>
              <Badge variant="info">Quote Generated</Badge>
              <Badge variant="orange">Calculation</Badge>
              <Badge variant="whatsapp">WhatsApp Ready</Badge>
              <Badge variant="navy">Official UAE</Badge>
            </div>
          </section>

          {/* Form Controls */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Form Inputs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <Input label="Standard Input" placeholder="Enter text..." />
              <Input
                label="Input With Error"
                defaultValue="invalid-data"
                error="This field is required and must follow format"
              />
              <Select label="Select Control" defaultValue="option1">
                <option value="option1">Option One</option>
                <option value="option2">Option Two</option>
              </Select>
              <Input
                label="Input with Helper"
                placeholder="Search..."
                helperText="Type 3 or more characters to filter."
              />
            </div>
          </section>

          {/* Cards */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Selectable & Interactive Cards</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                interactive
                selected={selectedCard === 'card-1'}
                onClick={() => setSelectedCard('card-1')}
                className="p-5"
              >
                <h4 className="font-bold text-sm text-slate-900">Selectable Option 1</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Click to toggle active selection state with orange ring and checkmark.
                </p>
              </Card>

              <Card
                interactive
                selected={selectedCard === 'card-2'}
                onClick={() => setSelectedCard('card-2')}
                className="p-5"
              >
                <h4 className="font-bold text-sm text-slate-900">Selectable Option 2</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Standard interactive card with elevation on hover.
                </p>
              </Card>
            </div>
          </section>

          {/* Alerts */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Alerts</h3>
            <div className="space-y-3 max-w-2xl">
              <Alert variant="info" title="Informational Message">
                This indicates helpful context or demo-mode awareness.
              </Alert>
              <Alert variant="success" title="Success Confirmation">
                Your quotation was calculated and dispatched successfully.
              </Alert>
              <Alert variant="warning" title="Warning Notice">
                Port tariffs may fluctuate prior to confirmed ocean container booking.
              </Alert>
              <Alert variant="error" title="Validation Error">
                Vehicle VIN or Lot number must be validated before clearance.
              </Alert>
            </div>
          </section>

          {/* Modal Demo */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Modal / Drawer Component</h3>
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Open Demo Modal
            </Button>
            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title="System Modal Example"
            >
              <div className="space-y-4 text-sm text-slate-600">
                <p>
                  This modal is mobile-responsive (sheets from bottom on mobile, centered on
                  desktop).
                </p>
                <Alert variant="info">Accessible focus and escape-key handling included.</Alert>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={() => setModalOpen(false)}>
                    Understood
                  </Button>
                </div>
              </div>
            </Modal>
          </section>

          {/* Loading & Skeleton */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Loaders & Skeletons</h3>
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
            <div className="space-y-2 max-w-md pt-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
};
