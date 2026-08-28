export type UUID = string;
export type LanguageCode = 'nl' | 'en' | 'de' | 'fr' | (string & {});
export type ListingStatus = 'draft'|'pending_review'|'active'|'reserved'|'sold'|'expired'|'rejected'|'suspended'|'archived'|'deleted';
export interface Category { id:UUID; parent_id:UUID|null; stable_key:string; level:number; sort_order:number; is_active:boolean; metadata:Record<string,unknown>; }
export interface CategoryTranslation { category_id:UUID; language_code:LanguageCode; name:string; slug:string; description:string|null; }
export interface AttributeDefinition { id:UUID; stable_key:string; data_type:'text'|'long_text'|'integer'|'decimal'|'boolean'|'date'|'datetime'|'single_select'|'multi_select'|'color'|'measurement'|'location'; unit_code:string|null; }
export interface Listing { id:UUID; seller_id:UUID; category_id:UUID; source_language:LanguageCode; title:string; description:string; price_minor:number|null; currency_code:string; status:ListingStatus; metadata:Record<string,unknown>; created_at:string; updated_at:string; }
export interface OutboxEvent<T=Record<string,unknown>> { id:number; aggregate_type:string; aggregate_id:UUID; event_type:string; payload:T; occurred_at:string; processed_at:string|null; attempts:number; }
