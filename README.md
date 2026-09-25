# Banana Bazaar

Gioco browser-based casual tycoon: produci, rifornisci, vendi e automatizza il tuo piccolo mercato.

## Avvio immediato

Non serve installare nulla: apri `index.html` con un browser moderno. Il gioco funziona con un doppio clic sul file.

In alternativa, per servirlo localmente:

```bash
python3 -m http.server 8080
```

Poi apri `http://localhost:8080`.

## Controlli

- Desktop: WASD o frecce direzionali.
- Mobile: joystick virtuale sul lato inferiore sinistro.
- Le azioni sono automatiche quando il personaggio entra nelle aree di prossimità.
- Vicino alla cassa si raccoglie il denaro accumulato.

## Funzionalità

- Produzione temporizzata di banane e mais.
- Inventario con capacità limitata.
- Scaffali con capacità limitata.
- Clienti che cercano prodotti, pagano e abbandonano il negozio.
- Denaro pendente alla cassa.
- Sblocco dell'area Mais.
- Aiutante rifornitore automatico.
- Potenziamento della velocità.
- Salvataggio automatico in `localStorage`.
- Ripristino dei progressi al riavvio.
- Pulsante per iniziare una nuova partita.
- Layout responsive per desktop e dispositivi touch.

## Salvataggio

Il salvataggio viene aggiornato periodicamente e quando la pagina viene chiusa. I dati sono memorizzati nel browser del giocatore con la chiave `banana-bazaar-save-v1`.

Per cancellare il salvataggio, usa il pulsante **Nuova partita** dentro il gioco oppure elimina i dati del sito dal browser.

## Nota tecnica

Il progetto usa Canvas 2D nativo e non richiede dipendenze o backend: questo permette di avviarlo direttamente dalla repository anche senza una toolchain Node.js. L’architettura è volutamente leggera e pronta per l’aggiunta di spritesheet, atlas, nuove macchine di trasformazione, lavoratori e mappe più grandi.
