-- Fixes a real production bug: currency was a manual, unlinked form field with no connection to
-- the listing's country -- confirmed live before this migration that real listings existed with
-- mismatched pairs (a Cameroon listing stored as NGN, a Nigeria listing stored as XAF). App code
-- (apps/web/lib/countries.ts's getCurrencyForCountry) now derives currency from country server-side
-- at creation time and no longer accepts it as a separate client field at all. This migration:
--   1. Backfills every existing listing's currency_code to match its location's country, using the
--      exact same country -> currency mapping as the app code.
--   2. Adds a CHECK constraint so currency_code can never again silently drift to a code outside
--      the real, supported ISO 4217 set (apps/web/lib/money.ts's SUPPORTED_CURRENCIES).
-- offers/orders/payments are deliberately NOT touched here -- each row there represents a
-- point-in-time agreed transaction term, and rewriting historical financial records after the
-- fact (even to "fix" them) is a worse outcome than leaving a handful of legacy rows alone; only
-- the listing's own display/price record is corrected.

update listings l
set currency_code = case loc.country_code
  -- Africa
  when 'NG' then 'NGN' when 'DZ' then 'DZD' when 'AO' then 'AOA' when 'BJ' then 'XOF'
  when 'BW' then 'BWP' when 'BF' then 'XOF' when 'BI' then 'BIF' when 'CV' then 'CVE'
  when 'CM' then 'XAF' when 'CF' then 'XAF' when 'TD' then 'XAF' when 'KM' then 'KMF'
  when 'CG' then 'XAF' when 'CD' then 'CDF' when 'CI' then 'XOF' when 'DJ' then 'DJF'
  when 'EG' then 'EGP' when 'GQ' then 'XAF' when 'ER' then 'ERN' when 'SZ' then 'SZL'
  when 'ET' then 'ETB' when 'GA' then 'XAF' when 'GM' then 'GMD' when 'GH' then 'GHS'
  when 'GN' then 'GNF' when 'GW' then 'XOF' when 'KE' then 'KES' when 'LS' then 'LSL'
  when 'LR' then 'LRD' when 'LY' then 'LYD' when 'MG' then 'MGA' when 'MW' then 'MWK'
  when 'ML' then 'XOF' when 'MR' then 'MRU' when 'MU' then 'MUR' when 'MA' then 'MAD'
  when 'MZ' then 'MZN' when 'NA' then 'NAD' when 'NE' then 'XOF' when 'RW' then 'RWF'
  when 'ST' then 'STN' when 'SN' then 'XOF' when 'SC' then 'SCR' when 'SL' then 'SLE'
  when 'SO' then 'SOS' when 'ZA' then 'ZAR' when 'SS' then 'SSP' when 'SD' then 'SDG'
  when 'TZ' then 'TZS' when 'TG' then 'XOF' when 'TN' then 'TND' when 'UG' then 'UGX'
  when 'ZM' then 'ZMW' when 'ZW' then 'ZWG'
  -- Europe
  when 'AL' then 'ALL' when 'AD' then 'EUR' when 'AT' then 'EUR' when 'BY' then 'BYN'
  when 'BE' then 'EUR' when 'BA' then 'BAM' when 'BG' then 'BGN' when 'HR' then 'EUR'
  when 'CY' then 'EUR' when 'CZ' then 'CZK' when 'DK' then 'DKK' when 'EE' then 'EUR'
  when 'FI' then 'EUR' when 'FR' then 'EUR' when 'DE' then 'EUR' when 'GR' then 'EUR'
  when 'HU' then 'HUF' when 'IS' then 'ISK' when 'IE' then 'EUR' when 'IT' then 'EUR'
  when 'XK' then 'EUR' when 'LV' then 'EUR' when 'LI' then 'CHF' when 'LT' then 'EUR'
  when 'LU' then 'EUR' when 'MT' then 'EUR' when 'MD' then 'MDL' when 'MC' then 'EUR'
  when 'ME' then 'EUR' when 'NL' then 'EUR' when 'MK' then 'MKD' when 'NO' then 'NOK'
  when 'PL' then 'PLN' when 'PT' then 'EUR' when 'RO' then 'RON' when 'RU' then 'RUB'
  when 'SM' then 'EUR' when 'RS' then 'RSD' when 'SK' then 'EUR' when 'SI' then 'EUR'
  when 'ES' then 'EUR' when 'SE' then 'SEK' when 'CH' then 'CHF' when 'UA' then 'UAH'
  when 'GB' then 'GBP'
  else l.currency_code -- unknown country code: leave whatever is already stored, don't guess
end
from locations loc
where l.location_id = loc.id
  and l.currency_code <> case loc.country_code
    when 'NG' then 'NGN' when 'DZ' then 'DZD' when 'AO' then 'AOA' when 'BJ' then 'XOF'
    when 'BW' then 'BWP' when 'BF' then 'XOF' when 'BI' then 'BIF' when 'CV' then 'CVE'
    when 'CM' then 'XAF' when 'CF' then 'XAF' when 'TD' then 'XAF' when 'KM' then 'KMF'
    when 'CG' then 'XAF' when 'CD' then 'CDF' when 'CI' then 'XOF' when 'DJ' then 'DJF'
    when 'EG' then 'EGP' when 'GQ' then 'XAF' when 'ER' then 'ERN' when 'SZ' then 'SZL'
    when 'ET' then 'ETB' when 'GA' then 'XAF' when 'GM' then 'GMD' when 'GH' then 'GHS'
    when 'GN' then 'GNF' when 'GW' then 'XOF' when 'KE' then 'KES' when 'LS' then 'LSL'
    when 'LR' then 'LRD' when 'LY' then 'LYD' when 'MG' then 'MGA' when 'MW' then 'MWK'
    when 'ML' then 'XOF' when 'MR' then 'MRU' when 'MU' then 'MUR' when 'MA' then 'MAD'
    when 'MZ' then 'MZN' when 'NA' then 'NAD' when 'NE' then 'XOF' when 'RW' then 'RWF'
    when 'ST' then 'STN' when 'SN' then 'XOF' when 'SC' then 'SCR' when 'SL' then 'SLE'
    when 'SO' then 'SOS' when 'ZA' then 'ZAR' when 'SS' then 'SSP' when 'SD' then 'SDG'
    when 'TZ' then 'TZS' when 'TG' then 'XOF' when 'TN' then 'TND' when 'UG' then 'UGX'
    when 'ZM' then 'ZMW' when 'ZW' then 'ZWG'
    when 'AL' then 'ALL' when 'AD' then 'EUR' when 'AT' then 'EUR' when 'BY' then 'BYN'
    when 'BE' then 'EUR' when 'BA' then 'BAM' when 'BG' then 'BGN' when 'HR' then 'EUR'
    when 'CY' then 'EUR' when 'CZ' then 'CZK' when 'DK' then 'DKK' when 'EE' then 'EUR'
    when 'FI' then 'EUR' when 'FR' then 'EUR' when 'DE' then 'EUR' when 'GR' then 'EUR'
    when 'HU' then 'HUF' when 'IS' then 'ISK' when 'IE' then 'EUR' when 'IT' then 'EUR'
    when 'XK' then 'EUR' when 'LV' then 'EUR' when 'LI' then 'CHF' when 'LT' then 'EUR'
    when 'LU' then 'EUR' when 'MT' then 'EUR' when 'MD' then 'MDL' when 'MC' then 'EUR'
    when 'ME' then 'EUR' when 'NL' then 'EUR' when 'MK' then 'MKD' when 'NO' then 'NOK'
    when 'PL' then 'PLN' when 'PT' then 'EUR' when 'RO' then 'RON' when 'RU' then 'RUB'
    when 'SM' then 'EUR' when 'RS' then 'RSD' when 'SK' then 'EUR' when 'SI' then 'EUR'
    when 'ES' then 'EUR' when 'SE' then 'SEK' when 'CH' then 'CHF' when 'UA' then 'UAH'
    when 'GB' then 'GBP'
    else l.currency_code
  end;

alter table listings drop constraint if exists listings_currency_code_valid;
alter table listings add constraint listings_currency_code_valid check (
  currency_code in (
    'USD','EUR','GBP','CHF',
    'NGN','DZD','AOA','XOF','BWP','BIF','CVE','XAF','KMF','CDF','DJF','EGP','ERN','SZL',
    'ETB','GMD','GHS','GNF','KES','LSL','LRD','LYD','MGA','MWK','MRU','MUR','MAD','MZN',
    'NAD','RWF','STN','SCR','SLE','SOS','ZAR','SSP','SDG','TZS','TND','UGX','ZMW','ZWG',
    'ALL','BYN','BAM','BGN','CZK','DKK','HUF','ISK','MDL','MKD','NOK','PLN','RON','RUB',
    'RSD','SEK','UAH'
  )
);
