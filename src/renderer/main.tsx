import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import '@fontsource/baloo-2/600.css'
import '@fontsource/baloo-2/700.css'
import '@fontsource/baloo-2/800.css'
import './estilos/base.css'
import './estilos/componentes.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('Elemento #raiz não encontrado')

void Promise.all([window.api.ambiente(), window.api.preferencias.obter()]).then(
  ([ambiente, preferencias]) => {
    createRoot(raiz).render(
      <StrictMode>
        <App ambiente={ambiente} preferencias={preferencias} />
      </StrictMode>
    )
  }
)
