import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {DeepgramToHypertranscript} from "./DeepGramTranscript.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeepgramToHypertranscript />
  </StrictMode>,
)
