# CLAUDE.md

## Reglas de trabajo

1. Explícame qué archivos vas a tocar, qué cambios harás y por qué antes de modificar código o hacer un commit.
2. Nunca traigas componentes de UI, layouts ni estilos de AURA House a Nero. Reutiliza únicamente lógica, validaciones y consultas, montándolas sobre los componentes existentes de Nero.
3. Nero y AURA House usan proyectos de Supabase distintos: nunca copies `.env`, credenciales ni apliques migraciones sin confirmar primero que apuntan exclusivamente al proyecto de Supabase de Nero.
