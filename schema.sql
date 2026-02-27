-- Nexus-Finance Schema

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Usuarios (Opcional, si usan Supabase Auth, se puede enlazar con auth.users)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Conexiones Bancarias (Fintoc)
CREATE TABLE public.conexiones_bancarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    link_token TEXT NOT NULL,
    institution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Transacciones
CREATE TABLE public.transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    fintoc_id TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    monto NUMERIC NOT NULL,
    tipo TEXT CHECK (tipo IN ('abono', 'cargo')),
    fecha DATE NOT NULL,
    categoria_asignada TEXT,
    estado_revision TEXT DEFAULT 'pendiente',
    razonamiento_breve TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Presupuestos
CREATE TABLE public.presupuestos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    limite NUMERIC NOT NULL,
    UNIQUE(user_id, categoria)
);

-- Políticas RLS básicos (Row Level Security) - Deshabilitados por simplicidad inicial, 
-- pero recomendados para producción.
-- ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "User can view own transactions" ON transacciones FOR SELECT USING (auth.uid() = user_id);

-- Insertar un usuario por defecto para desarrollo
INSERT INTO usuarios (id, email) VALUES ('00000000-0000-0000-0000-000000000000', 'demo@nexus-finance.test') ON CONFLICT DO NOTHING;
