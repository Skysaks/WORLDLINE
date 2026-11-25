# Contribuer / Contributing

WORLDLINE n'est pas un logiciel libre (voir [LICENSE](LICENSE)) : le code est public pour être lu et évalué.

- **Les pull requests ne sont pas acceptées.** Tout code proposé sera fermé sans relecture, pour que la
  propriété de l'œuvre reste à un seul auteur.
- **Les signalements de bugs et les suggestions sont bienvenus** sous forme d'issues : décris le problème,
  le navigateur et l'appareil, et les étapes pour le reproduire, sans joindre de code. N'y mets jamais de
  données personnelles.
- **Failles de sécurité** : voir [SECURITY.md](SECURITY.md), jamais en issue publique.

En ouvrant une issue, tu acceptes que l'auteur puisse utiliser librement toute suggestion qu'elle contient,
sans obligation ni contrepartie.

## Avant de signaler un bug

```bash
npm ci
npm run build -- --check   # dist/ correspond aux sources
npm test                   # tests d'intégrité + parcours bureau et mobile
```

Si un test échoue sur ta machine, joins sa sortie à l'issue.

*Pull requests are not accepted. Bug reports and suggestions are welcome as issues — never include
personal data. Security issues: see [SECURITY.md](SECURITY.md).*
