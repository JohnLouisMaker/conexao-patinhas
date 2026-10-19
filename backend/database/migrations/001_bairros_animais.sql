CREATE TABLE IF NOT EXISTS bairro (
  id_bairro INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  uf CHAR(2) NOT NULL,
  UNIQUE (nome, cidade, uf)
);
CREATE TABLE IF NOT EXISTS animal (
  id_animal INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_responsavel INTEGER NOT NULL REFERENCES usuario(id_usuario),
  id_bairro INTEGER NOT NULL REFERENCES bairro(id_bairro),
  nome VARCHAR(100) NOT NULL,
  idade_meses INTEGER NOT NULL CHECK (idade_meses >= 0),
  tipo VARCHAR(20) NOT NULL,
  caracteristicas TEXT NOT NULL,
  foto_url TEXT NOT NULL,
  status_adocao VARCHAR(20) NOT NULL DEFAULT 'disponivel',
  data_cadastro TIMESTAMP NOT NULL
);
