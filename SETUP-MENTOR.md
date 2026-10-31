# Mentor Przewagi — landing page i analityka

## Co już działa na stronie GitHub Pages
- Nowa, responsywna oferta marki Mentor Przewagi, dwa formularze (próbka + lista premierowa), układ ceny 49 zł (planowana późniejsza 94 zł).
- Modal zgody na opcjonalne technologie analityczne/reklamowe. Google Analytics 4, Meta Pixel i TikTok Pixel wczytują się tylko po opt-in i tylko przy uzupełnionych identyfikatorach.
- Parametry UTM z Meta/TikTok/Shorts przekazywane do serwera razem z formularzem, bez trafiania do reklamowych pikseli jako PII.
- Publiczny licznik pojawi się tylko, jeśli skonfigurowany serwer zwróci rzeczywistą liczbę potwierdzonych zapisów.
- Bez konfiguracji serwera formularze pokazują komunikat zamiast pozorować zapis. Bez linku do operatora płatności nie ma przycisku rzeczywistego zakupu.

## Niezbędne kroki przed kampaniami
1. Utwórz bazę Cloudflare D1, wykonaj \`schema.sql\`, powiąż jako \`DB\` z Workerem.
2. Zainstaluj Worker z pliku \`worker.js\` pod własną domeną HTTPS, ustaw:
   - \`PUBLIC_ORIGIN\` dokładny origin strony, np. \`https://radek2011.github.io\` lub własna domena.
   - \`SITE_URL\` pełny publiczny URL landing page.
   - \`SAMPLE_PDF_URL\` pełny publiczny URL zatwierdzonego 5-stronicowego PDF.
   - sekret \`RESEND_API_KEY\` od dostawcy maili (Resend), \`FROM_EMAIL\` na zweryfikowanej domenie, \`ADMIN_TOKEN\` mocny sekret.
3. Przetestuj mail potwierdzający, przejście na PDF, ponowny zapis, zliczanie potwierdzonych i raport \`/admin/summary\`.
4. W \`index.html\` przed końcowym skryptem ustaw \`window.MP_CONFIG={apiBase:"https://...",ga4Id:"G-...",metaPixelId:"...",tiktokPixelId:"...",checkoutUrl:""};\` (konfiguracja bez sekretów).
5. Włącz realny checkout **dopiero po** aktywowaniu operatora płatności, zasad przedsprzedaży, regulaminu, terminu dostarczenia i odpowiednich potwierdzeń. \`checkoutUrl\` jest globalny, więc po uruchomieniu sprzedaży należy poprawić copy i nie mieszać listy zainteresowanych z już kupującymi.
6. Uzupełnij politykę prywatności i cookie, adres administratora danych oraz pełne informacje prawne, zanim zaczniesz pozyskiwać adresy i uruchomisz reklamy.

## Pomiar kampanii
Do wszystkich linków stosuj UTM:
- Meta: \`?utm_source=facebook&utm_medium=paid_social&utm_campaign=ebook_premiera&utm_content=kreacja_a\`
- TikTok: \`?utm_source=tiktok&utm_medium=paid_social&utm_campaign=ebook_premiera&utm_content=video_1\`
- Shorts: \`?utm_source=youtube&utm_medium=organic_social&utm_campaign=ebook_premiera&utm_content=short_1\`

Po wdrożeniu:
- GA4: page_view, cta_click, preview_signup, waitlist_signup (zdarzenia formularzy, nie oznaczają potwierdzenia e-mail).
- Meta Pixel: Lead przy udanym wysłaniu formularza i zgodzie reklamowej (nie Purchase).
- TikTok Pixel: SubmitForm przy udanym wysłaniu formularza i zgodzie reklamowej.
- D1: potwierdzone zapisy per kanał i kampania. Przez \`/admin/summary\` (Bearer ADMIN_TOKEN).
- Dla prawdziwych zakupów potrzebny webhook operatora płatności; nie wysyłaj Purchase na kliknięcie czy zapis. 
- Uwaga: skuteczność zewnętrznych pikseli zależy od zgody i ograniczeń przeglądarki. Zestawiaj ją z raportem D1.

## Bezpieczeństwo i prywatność
- Nie przechowuj tajnych kluczy w GitHub Pages; zawsze w sekretach Workera.
- Nie publikuj danych osób na liczniku, tylko liczby potwierdzonych.
- Dodaj reCAPTCHA/Turnstile i limity IP na Cloudflare przed kampanią, a także harmonogram retencji/usuwania danych.
- Nazwę \`Smart Budget\` i kwotę 19 040 zł przedstawiamy jako odpowiednio przykład edukacyjny oraz niezależny hipotetyczny scenariusz, nie gwarancję.
- Plik PDF jest udostępniany po potwierdzeniu adresu, ale sam link do PDF może być publiczny; jeśli potrzebujesz ścisłej kontroli pobrań, użyj ograniczonego czasowo podpisanego linku.
