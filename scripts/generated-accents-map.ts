/**
 * Restaura acentos comuns em nomes de bairros
 * Gerado automaticamente em 2025-08-05T17:26:11.072Z
 * Total de bairros mapeados: 51
 */
function restoreCommonAccents(normalized: string): string {
  const accentsMap: { [key: string]: string } = {
        'ARQUIPELAGO': "ARQUIPÉLAGO",
        'BELEM NOVO': "BELÉM NOVO",
        'BELEM VELHO': "BELÉM VELHO",
        'CAMAQUA': "CAMAQUÃ",
        'CENTRO HISTORICO': "CENTRO HISTÓRICO",
        'CHAPEU DO SOL': "CHAPÉU DO SOL",
        'CHACARA DAS PEDRAS': "CHÁCARA DAS PEDRAS",
        'ESPIRITO SANTO': "ESPÍRITO SANTO",
        'GLORIA': "GLÓRIA",
        'GUARUJA': "GUARUJÁ",
        'HIGIENOPOLIS': "HIGIENÓPOLIS",
        'HUMAITA': "HUMAITÁ",
        'HIPICA': "HÍPICA",
        'INDEPENDENCIA': "INDEPENDÊNCIA",
        'JARDIM BOTANICO': "JARDIM BOTÂNICO",
        'JARDIM LINDOIA': "JARDIM LINDÓIA",
        'JARDIM SABARA': "JARDIM SABARÁ",
        'JARDIM SAO PEDRO': "JARDIM SÃO PEDRO",
        'MARIO QUINTANA': "MÁRIO QUINTANA",
        'PARQUE SANTA FE': "PARQUE SANTA FÉ",
        'PETROPOLIS': "PETRÓPOLIS",
        'SANTA CECILIA': "SANTA CECÍLIA",
        'SANTO ANTONIO': "SANTO ANTÔNIO",
        'SAO CAETANO': "SÃO CAETANO",
        'SAO GERALDO': "SÃO GERALDO",
        'SAO JOAO': "SÃO JOÃO",
        'SAO SEBASTIAO': "SÃO SEBASTIÃO",
        'SETIMO CEU': "SÉTIMO CÉU",
        'TERESOPOLIS': "TERESÓPOLIS",
        'TRES FIGUEIRAS': "TRÊS FIGUEIRAS",
        'VILA  ASSUNCAO': "VILA  ASSUNÇÃO",
        'VILA CONCEICAO': "VILA CONCEIÇÃO",
        'VILA JOAO PESSOA': "VILA JOÃO PESSOA",
        'VILA SAO JOSE': "VILA SÃO JOSÉ",
        'MONT SERRAT': "MONT'SERRAT",
        'SAO JOSE': "SÃO JOSÉ",
        'VILA ASSUNCAO': "VILA ASSUNÇÃO",
        'IPANEMA': "IPANEMA",
        'LOMBA DO PINHEIRO': "LOMBA DO PINHEIRO",
        'MEDIANEIRA': "MEDIANEIRA",
        'NAVEGANTES': "NAVEGANTES",
        'PARTENON': "PARTENON",
        'PEDRA REDONDA': "PEDRA REDONDA",
        'PONTA GROSSA': "PONTA GROSSA",
        'RESTINGA': "RESTINGA",
        'RUBEM BERTA': "RUBEM BERTA",
        'SANTA MARIA GORETTI': "SANTA MARIA GORETTI",
        'SANTA TEREZA': "SANTA TEREZA",
        'SARANDI': "SARANDI",
        'VILA JARDIM': "VILA JARDIM",
        'VILA NOVA': "VILA NOVA"
};
  
  return accentsMap[normalized] || normalized;
}