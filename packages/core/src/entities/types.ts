import type { NI18n } from '../i18n'
import type { NLexicon } from '../lexicon'
import type { NLocale } from '../types'

export type ParseCtx = { locale: NLocale; i18n: NI18n; lexicon: NLexicon }
