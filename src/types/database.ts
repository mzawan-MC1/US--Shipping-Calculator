export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      additional_charge_rules: {
        Row: {
          amount: number;
          category: string;
          charge_type: string;
          country_code: string | null;
          created_at: string;
          currency: string;
          destination_port_id: string | null;
          id: string;
          is_active: boolean;
          is_included_in_vat_base: boolean;
          is_mandatory: boolean;
          name: string;
        };
        Insert: {
          amount: number;
          category: string;
          charge_type: string;
          country_code?: string | null;
          created_at?: string;
          currency?: string;
          destination_port_id?: string | null;
          id?: string;
          is_active?: boolean;
          is_included_in_vat_base?: boolean;
          is_mandatory?: boolean;
          name: string;
        };
        Update: {
          amount?: number;
          category?: string;
          charge_type?: string;
          country_code?: string | null;
          created_at?: string;
          currency?: string;
          destination_port_id?: string | null;
          id?: string;
          is_active?: boolean;
          is_included_in_vat_base?: boolean;
          is_mandatory?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'additional_charge_rules_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
          {
            foreignKeyName: 'additional_charge_rules_destination_port_id_fkey';
            columns: ['destination_port_id'];
            isOneToOne: false;
            referencedRelation: 'ports';
            referencedColumns: ['id'];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          entity_id: string;
          entity_table: string;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
          performed_at: string;
          performed_by: string | null;
        };
        Insert: {
          action: string;
          entity_id: string;
          entity_table: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          performed_at?: string;
          performed_by?: string | null;
        };
        Update: {
          action?: string;
          entity_id?: string;
          entity_table?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          performed_at?: string;
          performed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_events_performed_by_fkey';
            columns: ['performed_by'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_events_performed_by_fkey';
            columns: ['performed_by'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cms_notices: {
        Row: {
          banner_type: string;
          content: string;
          content_ar: string | null;
          created_at: string | null;
          display_location: string;
          display_order: number;
          id: string;
          is_active: boolean;
          title: string;
          title_ar: string | null;
          updated_at: string | null;
        };
        Insert: {
          banner_type?: string;
          content: string;
          content_ar?: string | null;
          created_at?: string | null;
          display_location?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          title: string;
          title_ar?: string | null;
          updated_at?: string | null;
        };
        Update: {
          banner_type?: string;
          content?: string;
          content_ar?: string | null;
          created_at?: string | null;
          display_location?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          title?: string;
          title_ar?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      countries: {
        Row: {
          code: string;
          created_at: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      customer_vehicles: {
        Row: {
          condition_id: string | null;
          created_at: string;
          customer_id: string;
          declared_value_usd: number;
          id: string;
          listing_url: string | null;
          lot_number: string | null;
          make: string | null;
          model: string | null;
          powertrain_id: string;
          vehicle_category_id: string;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          condition_id?: string | null;
          created_at?: string;
          customer_id: string;
          declared_value_usd: number;
          id?: string;
          listing_url?: string | null;
          lot_number?: string | null;
          make?: string | null;
          model?: string | null;
          powertrain_id: string;
          vehicle_category_id: string;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          condition_id?: string | null;
          created_at?: string;
          customer_id?: string;
          declared_value_usd?: number;
          id?: string;
          listing_url?: string | null;
          lot_number?: string | null;
          make?: string | null;
          model?: string | null;
          powertrain_id?: string;
          vehicle_category_id?: string;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_vehicles_condition_id_fkey';
            columns: ['condition_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_conditions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_vehicles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_vehicles_powertrain_id_fkey';
            columns: ['powertrain_id'];
            isOneToOne: false;
            referencedRelation: 'powertrains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_vehicles_vehicle_category_id_fkey';
            columns: ['vehicle_category_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          city: string | null;
          country: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          notes: string | null;
          phone: string;
          updated_at: string;
        };
        Insert: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          notes?: string | null;
          phone: string;
          updated_at?: string;
        };
        Update: {
          city?: string | null;
          country?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          notes?: string | null;
          phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      destination_tax_rules: {
        Row: {
          calculation_base: string;
          country_code: string;
          created_at: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          is_active: boolean;
          name: string;
          percentage: number;
          tax_type: string;
        };
        Insert: {
          calculation_base: string;
          country_code: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          percentage: number;
          tax_type: string;
        };
        Update: {
          calculation_base?: string;
          country_code?: string;
          created_at?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          percentage?: number;
          tax_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'destination_tax_rules_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      enquiries: {
        Row: {
          assigned_staff_id: string | null;
          created_at: string;
          customer_id: string;
          follow_up_date: string | null;
          id: string;
          notes: string | null;
          reference_number: string;
          source: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          assigned_staff_id?: string | null;
          created_at?: string;
          customer_id: string;
          follow_up_date?: string | null;
          id?: string;
          notes?: string | null;
          reference_number: string;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          assigned_staff_id?: string | null;
          created_at?: string;
          customer_id?: string;
          follow_up_date?: string | null;
          id?: string;
          notes?: string | null;
          reference_number?: string;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'enquiries_assigned_staff_id_fkey';
            columns: ['assigned_staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enquiries_assigned_staff_id_fkey';
            columns: ['assigned_staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enquiries_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      enquiry_status_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          enquiry_id: string;
          id: string;
          new_status: string;
          notes: string | null;
          old_status: string | null;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          enquiry_id: string;
          id?: string;
          new_status: string;
          notes?: string | null;
          old_status?: string | null;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          enquiry_id?: string;
          id?: string;
          new_status?: string;
          notes?: string | null;
          old_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enquiry_status_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enquiry_status_history_changed_by_fkey';
            columns: ['changed_by'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enquiry_status_history_enquiry_id_fkey';
            columns: ['enquiry_id'];
            isOneToOne: false;
            referencedRelation: 'enquiries';
            referencedColumns: ['id'];
          },
        ];
      };
      exchange_rates: {
        Row: {
          created_at: string;
          created_by: string | null;
          effective_from: string;
          from_currency: string;
          id: string;
          is_active: boolean;
          rate: number;
          to_currency: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          from_currency: string;
          id?: string;
          is_active?: boolean;
          rate: number;
          to_currency: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          from_currency?: string;
          id?: string;
          is_active?: boolean;
          rate?: number;
          to_currency?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exchange_rates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exchange_rates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      permissions: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      ports: {
        Row: {
          code: string;
          country_code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          is_destination_port: boolean;
          is_loading_port: boolean;
          name: string;
          state_or_city: string;
        };
        Insert: {
          code: string;
          country_code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_destination_port?: boolean;
          is_loading_port?: boolean;
          name: string;
          state_or_city: string;
        };
        Update: {
          code?: string;
          country_code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          is_destination_port?: boolean;
          is_loading_port?: boolean;
          name?: string;
          state_or_city?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ports_country_code_fkey';
            columns: ['country_code'];
            isOneToOne: false;
            referencedRelation: 'countries';
            referencedColumns: ['code'];
          },
        ];
      };
      powertrains: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      purchase_locations: {
        Row: {
          created_at: string;
          default_loading_port_id: string | null;
          id: string;
          is_active: boolean;
          name: string;
          postal_code: string | null;
          purchase_source_id: string;
          state_code: string;
        };
        Insert: {
          created_at?: string;
          default_loading_port_id?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          postal_code?: string | null;
          purchase_source_id: string;
          state_code: string;
        };
        Update: {
          created_at?: string;
          default_loading_port_id?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          postal_code?: string | null;
          purchase_source_id?: string;
          state_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'purchase_locations_default_loading_port_id_fkey';
            columns: ['default_loading_port_id'];
            isOneToOne: false;
            referencedRelation: 'ports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_locations_purchase_source_id_fkey';
            columns: ['purchase_source_id'];
            isOneToOne: false;
            referencedRelation: 'purchase_sources';
            referencedColumns: ['id'];
          },
        ];
      };
      purchase_sources: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      quotation_line_items: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          currency: string;
          description: string;
          id: string;
          quotation_id: string;
          source_rule_id: string | null;
          source_rule_type: string | null;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string;
          currency?: string;
          description: string;
          id?: string;
          quotation_id: string;
          source_rule_id?: string | null;
          source_rule_type?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          currency?: string;
          description?: string;
          id?: string;
          quotation_id?: string;
          source_rule_id?: string | null;
          source_rule_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quotation_line_items_quotation_id_fkey';
            columns: ['quotation_id'];
            isOneToOne: false;
            referencedRelation: 'quotations';
            referencedColumns: ['id'];
          },
        ];
      };
      quotations: {
        Row: {
          cif_value: number;
          created_at: string;
          currency: string;
          customs_clearance_fee: number;
          customs_duty: number;
          disclaimer: string;
          enquiry_id: string;
          exchange_rate: number;
          id: string;
          idempotency_key: string | null;
          import_vat: number;
          is_towing_range: boolean;
          port_additional_charges: number;
          pricing_snapshot: Json;
          reference_number: string;
          route_id: string | null;
          subtotal_ocean_freight: number;
          total_charges_aed_max: number;
          total_charges_aed_min: number;
          total_charges_usd_max: number;
          total_charges_usd_min: number;
          towing_fee_max: number | null;
          towing_fee_min: number | null;
          vat_taxable_value: number;
          version: number;
        };
        Insert: {
          cif_value: number;
          created_at?: string;
          currency?: string;
          customs_clearance_fee: number;
          customs_duty: number;
          disclaimer: string;
          enquiry_id: string;
          exchange_rate: number;
          id?: string;
          idempotency_key?: string | null;
          import_vat: number;
          is_towing_range?: boolean;
          port_additional_charges: number;
          pricing_snapshot: Json;
          reference_number: string;
          route_id?: string | null;
          subtotal_ocean_freight: number;
          total_charges_aed_max: number;
          total_charges_aed_min: number;
          total_charges_usd_max: number;
          total_charges_usd_min: number;
          towing_fee_max?: number | null;
          towing_fee_min?: number | null;
          vat_taxable_value: number;
          version?: number;
        };
        Update: {
          cif_value?: number;
          created_at?: string;
          currency?: string;
          customs_clearance_fee?: number;
          customs_duty?: number;
          disclaimer?: string;
          enquiry_id?: string;
          exchange_rate?: number;
          id?: string;
          idempotency_key?: string | null;
          import_vat?: number;
          is_towing_range?: boolean;
          port_additional_charges?: number;
          pricing_snapshot?: Json;
          reference_number?: string;
          route_id?: string | null;
          subtotal_ocean_freight?: number;
          total_charges_aed_max?: number;
          total_charges_aed_min?: number;
          total_charges_usd_max?: number;
          total_charges_usd_min?: number;
          towing_fee_max?: number | null;
          towing_fee_min?: number | null;
          vat_taxable_value?: number;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quotations_enquiry_id_fkey';
            columns: ['enquiry_id'];
            isOneToOne: false;
            referencedRelation: 'enquiries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotations_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'shipping_routes';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission_id: string;
          role_id: string;
        };
        Insert: {
          permission_id: string;
          role_id: string;
        };
        Update: {
          permission_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey';
            columns: ['permission_id'];
            isOneToOne: false;
            referencedRelation: 'permissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          is_system: boolean;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id: string;
          is_active?: boolean;
          is_system?: boolean;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      route_freight_rates: {
        Row: {
          base_amount: number;
          created_at: string;
          currency: string;
          effective_from: string;
          effective_to: string | null;
          id: string;
          is_active: boolean;
          powertrain_id: string;
          route_id: string;
          shipping_method_id: string;
          updated_at: string;
          vehicle_category_id: string;
        };
        Insert: {
          base_amount: number;
          created_at?: string;
          currency?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_active?: boolean;
          powertrain_id: string;
          route_id: string;
          shipping_method_id: string;
          updated_at?: string;
          vehicle_category_id: string;
        };
        Update: {
          base_amount?: number;
          created_at?: string;
          currency?: string;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_active?: boolean;
          powertrain_id?: string;
          route_id?: string;
          shipping_method_id?: string;
          updated_at?: string;
          vehicle_category_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'route_freight_rates_powertrain_id_fkey';
            columns: ['powertrain_id'];
            isOneToOne: false;
            referencedRelation: 'powertrains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_freight_rates_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'shipping_routes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_freight_rates_shipping_method_id_fkey';
            columns: ['shipping_method_id'];
            isOneToOne: false;
            referencedRelation: 'shipping_methods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'route_freight_rates_vehicle_category_id_fkey';
            columns: ['vehicle_category_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      shipping_methods: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      shipping_routes: {
        Row: {
          created_at: string;
          destination_port_id: string;
          id: string;
          is_active: boolean;
          origin_port_id: string;
          transit_days_max: number;
          transit_days_min: number;
        };
        Insert: {
          created_at?: string;
          destination_port_id: string;
          id?: string;
          is_active?: boolean;
          origin_port_id: string;
          transit_days_max: number;
          transit_days_min: number;
        };
        Update: {
          created_at?: string;
          destination_port_id?: string;
          id?: string;
          is_active?: boolean;
          origin_port_id?: string;
          transit_days_max?: number;
          transit_days_min?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'shipping_routes_destination_port_id_fkey';
            columns: ['destination_port_id'];
            isOneToOne: false;
            referencedRelation: 'ports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shipping_routes_origin_port_id_fkey';
            columns: ['origin_port_id'];
            isOneToOne: false;
            referencedRelation: 'ports';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_invitations: {
        Row: {
          created_at: string;
          email: string;
          email_sent: boolean;
          full_name: string;
          id: string;
          invited_by: string | null;
          last_resent_at: string | null;
          resend_count: number;
          role_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          email_sent?: boolean;
          full_name: string;
          id?: string;
          invited_by?: string | null;
          last_resent_at?: string | null;
          resend_count?: number;
          role_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          email_sent?: boolean;
          full_name?: string;
          id?: string;
          invited_by?: string | null;
          last_resent_at?: string | null;
          resend_count?: number;
          role_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_invitations_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_role_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          role_id: string;
          staff_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id: string;
          staff_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          role_id?: string;
          staff_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_role_assignments_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_role_assignments_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_role_assignments_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_role_assignments_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_role_assignments_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      surcharge_rules: {
        Row: {
          amount: number;
          charge_type: string;
          created_at: string;
          currency: string;
          id: string;
          is_active: boolean;
          name: string;
          powertrain_id: string | null;
          vehicle_category_id: string | null;
          vehicle_condition_id: string | null;
        };
        Insert: {
          amount: number;
          charge_type: string;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          powertrain_id?: string | null;
          vehicle_category_id?: string | null;
          vehicle_condition_id?: string | null;
        };
        Update: {
          amount?: number;
          charge_type?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          powertrain_id?: string | null;
          vehicle_category_id?: string | null;
          vehicle_condition_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'surcharge_rules_powertrain_id_fkey';
            columns: ['powertrain_id'];
            isOneToOne: false;
            referencedRelation: 'powertrains';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'surcharge_rules_vehicle_category_id_fkey';
            columns: ['vehicle_category_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'surcharge_rules_vehicle_condition_id_fkey';
            columns: ['vehicle_condition_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_conditions';
            referencedColumns: ['id'];
          },
        ];
      };
      system_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'system_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'staff_directory_view';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'system_settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      towing_rates: {
        Row: {
          created_at: string;
          currency: string;
          effective_from: string;
          effective_to: string | null;
          fixed_amount: number | null;
          id: string;
          is_active: boolean;
          loading_port_id: string;
          max_amount: number | null;
          min_amount: number | null;
          purchase_location_id: string;
          rate_type: string;
          updated_at: string;
          vehicle_category_id: string | null;
          vehicle_condition_id: string | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          effective_from?: string;
          effective_to?: string | null;
          fixed_amount?: number | null;
          id?: string;
          is_active?: boolean;
          loading_port_id: string;
          max_amount?: number | null;
          min_amount?: number | null;
          purchase_location_id: string;
          rate_type: string;
          updated_at?: string;
          vehicle_category_id?: string | null;
          vehicle_condition_id?: string | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          effective_from?: string;
          effective_to?: string | null;
          fixed_amount?: number | null;
          id?: string;
          is_active?: boolean;
          loading_port_id?: string;
          max_amount?: number | null;
          min_amount?: number | null;
          purchase_location_id?: string;
          rate_type?: string;
          updated_at?: string;
          vehicle_category_id?: string | null;
          vehicle_condition_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'towing_rates_loading_port_id_fkey';
            columns: ['loading_port_id'];
            isOneToOne: false;
            referencedRelation: 'ports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'towing_rates_purchase_location_id_fkey';
            columns: ['purchase_location_id'];
            isOneToOne: false;
            referencedRelation: 'purchase_locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'towing_rates_vehicle_category_id_fkey';
            columns: ['vehicle_category_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'towing_rates_vehicle_condition_id_fkey';
            columns: ['vehicle_condition_id'];
            isOneToOne: false;
            referencedRelation: 'vehicle_conditions';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicle_categories: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      vehicle_conditions: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      staff_directory_view: {
        Row: {
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string | null;
          is_active: boolean | null;
          role_description: string | null;
          role_id: string | null;
          role_is_active: boolean | null;
          role_is_system: boolean | null;
          role_name: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_role_assignments_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      accept_staff_invitation: { Args: never; Returns: Json };
      admin_clone_role: {
        Args: {
          p_new_description: string;
          p_new_name: string;
          p_new_role_id: string;
          p_source_role_id: string;
        };
        Returns: Json;
      };
      admin_create_role:
        | {
            Args: {
              p_description: string;
              p_id: string;
              p_name: string;
              p_permissions: string[];
            };
            Returns: Json;
          }
        | {
            Args: {
              p_description: string;
              p_name: string;
              p_permissions: string[];
            };
            Returns: Json;
          };
      admin_delete_role: { Args: { p_role_id: string }; Returns: Json };
      admin_invite_or_create_staff: {
        Args: { p_email: string; p_full_name: string; p_role_id: string };
        Returns: Json;
      };
      admin_resend_staff_invitation: {
        Args: { p_invitation_id: string };
        Returns: Json;
      };
      admin_revoke_staff_invitation: {
        Args: { p_invitation_id: string };
        Returns: Json;
      };
      admin_toggle_staff_status: {
        Args: { p_is_active: boolean; p_staff_id: string };
        Returns: Json;
      };
      admin_update_enquiry_status: {
        Args: { p_enquiry_id: string; p_new_status: string; p_notes?: string };
        Returns: Json;
      };
      admin_update_role: {
        Args: {
          p_description: string;
          p_is_active?: boolean;
          p_name: string;
          p_permissions: string[];
          p_role_id: string;
        };
        Returns: Json;
      };
      admin_update_staff_role: {
        Args: { p_role_id: string; p_staff_id: string };
        Returns: Json;
      };
      bootstrap_super_admin: { Args: { target_email: string }; Returns: Json };
      calculate_shipping_quote_v1: { Args: { input_json: Json }; Returns: Json };
      get_user_permissions: {
        Args: { target_user_id?: string };
        Returns: {
          permission_id: string;
        }[];
      };
      has_permission: { Args: { required_perm: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
