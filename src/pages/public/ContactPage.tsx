import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { UNVERIFIED_CONTENT } from '../../config/unverifiedContent';
import { MapPin, Phone, Mail, MessageCircle, Clock, QrCode, ShieldCheck } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { t } = useI18n();

  const whatsappHref = `https://wa.me/${UNVERIFIED_CONTENT.whatsappNumber}?text=${encodeURIComponent(
    'Hello Fakher Alam Shipping, I would like to inquire about car shipping rates from USA to UAE.'
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 py-8 sm:py-14 w-full overflow-x-hidden">
      <Container className="max-w-3xl px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold mb-2">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dedicated WhatsApp Support Channel</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-brand-navy-950">{t.navContact}</h1>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Connect directly with our Sharjah logistics coordinators via WhatsApp for live ocean
            freight quotes, inland towing inquiries, or vehicle tracking.
          </p>
        </div>

        <div className="space-y-6">
          {/* Main WhatsApp Focus Card */}
          <Card className="p-6 sm:p-8 bg-brand-navy-950 text-white border-brand-navy-900 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-brand-navy-800">
              <div className="text-center sm:text-start space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online & Ready to Quote</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Instant WhatsApp Quotation & Booking
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
                  Send your auction lot number, vehicle model, or pickup zip code directly to our
                  team for a fast, itemized quote.
                </p>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white text-slate-900 shadow-md shrink-0">
                <QrCode className="w-24 h-24 text-brand-navy-950" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mt-1">
                  Scan to Chat
                </span>
              </div>
            </div>

            {/* Direct WhatsApp CTA Button */}
            <div className="pt-6">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button
                  variant="whatsapp"
                  size="lg"
                  className="w-full text-base font-black shadow-whatsapp-glow py-4"
                  startIcon={<MessageCircle className="w-6 h-6" />}
                >
                  Start WhatsApp Consultation ({UNVERIFIED_CONTENT.phoneDisplay})
                </Button>
              </a>
            </div>
          </Card>

          {/* Business Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Headquarters & Address */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-brand-orange-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Operations Terminal
                  </h4>
                  <p className="text-sm font-bold text-slate-900">{t.brandName}</p>
                  <p className="text-xs text-slate-600">{UNVERIFIED_CONTENT.addressFull}</p>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold pt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Licensed UAE Freight Facility</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Working Hours & Availability */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Business Working Hours
                  </h4>
                  <p className="text-sm font-bold text-slate-900">
                    {UNVERIFIED_CONTENT.businessHoursDays}
                  </p>
                  <p className="text-xs text-slate-600">{UNVERIFIED_CONTENT.businessHoursTime}</p>
                  <p className="text-[11px] text-brand-orange-600 font-semibold pt-1">
                    {UNVERIFIED_CONTENT.emergencySupportNote}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Secondary Contact Channels */}
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-brand-orange-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Telephone Inquiry:</span>
                  <a
                    href={`tel:${UNVERIFIED_CONTENT.phoneTel}`}
                    className="font-bold text-slate-900 hover:text-brand-orange-600"
                  >
                    {UNVERIFIED_CONTENT.phonePrimary}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brand-orange-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Corporate Email:</span>
                  <a
                    href={`mailto:${UNVERIFIED_CONTENT.emailSupport}`}
                    className="font-bold text-slate-900 hover:text-brand-orange-600"
                  >
                    {UNVERIFIED_CONTENT.emailSupport}
                  </a>
                </div>
              </div>
            </div>
          </Card>

          {/* Provisional Content Notice */}
          <Alert variant="info" title="Staging Demonstration Notice">
            {UNVERIFIED_CONTENT.provisionalNotice}
          </Alert>
        </div>
      </Container>
    </div>
  );
};
