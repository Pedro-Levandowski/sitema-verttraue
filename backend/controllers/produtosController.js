const pool = require('../config/database');

// Listar todos os produtos com informações de fornecedor e estoque de afiliados
const getAllProdutos = async (req, res) => {
  try {
    console.log('📦 Buscando todos os produtos...');
    
    const result = await pool.query(`
      SELECT 
        p.*,
        f.nome as fornecedor_nome,
        f.cidade as fornecedor_cidade,
        f.contato as fornecedor_contato
      FROM produtos p
      LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
      ORDER BY p.created_at DESC
    `);

    // Buscar estoque de afiliados para cada produto
    const produtos = [];
    for (const row of result.rows) {
      const estoqueAfiliados = await pool.query(`
        SELECT ae.*, a.nome_completo as afiliado_nome
        FROM afiliado_estoque ae
        JOIN afiliados a ON ae.afiliado_id = a.id
        WHERE ae.produto_id = $1
      `, [row.id]);

      produtos.push({
        id: row.id,
        nome: row.nome || '',
        descricao: row.descricao || '',
        estoque_fisico: parseInt(row.estoque_fisico) || 0,
        estoque_site: parseInt(row.estoque_site) || 0,
        preco: parseFloat(row.preco) || 0,
        preco_compra: parseFloat(row.preco_compra) || 0,
        fornecedor: row.fornecedor_id ? {
          id: row.fornecedor_id,
          nome: row.fornecedor_nome || '',
          cidade: row.fornecedor_cidade || '',
          contato: row.fornecedor_contato || ''
        } : null,
        afiliado_estoque: estoqueAfiliados.rows.map(ae => ({
          afiliado_id: ae.afiliado_id,
          afiliado_nome: ae.afiliado_nome,
          quantidade: parseInt(ae.quantidade) || 0
        })),
        fotos: [],
        created_at: row.created_at,
        updated_at: row.updated_at
      });
    }

    console.log(`✅ ${produtos.length} produtos encontrados`);
    res.json(produtos);
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar produto por ID com informações completas
const getProdutoById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📦 Buscando produto:', id);

    const result = await pool.query(`
      SELECT 
        p.*,
        f.nome as fornecedor_nome,
        f.cidade as fornecedor_cidade,
        f.contato as fornecedor_contato
      FROM produtos p
      LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      console.log('❌ Produto não encontrado:', id);
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const produto = result.rows[0];
    
    // Buscar fotos do produto
    const fotosResult = await pool.query(
      'SELECT url_foto FROM produto_fotos WHERE produto_id = $1 ORDER BY ordem',
      [id]
    );

    // Buscar estoque de afiliados
    const estoqueAfiliados = await pool.query(`
      SELECT ae.*, a.nome_completo as afiliado_nome
      FROM afiliado_estoque ae
      JOIN afiliados a ON ae.afiliado_id = a.id
      WHERE ae.produto_id = $1
    `, [id]);

    const produtoCompleto = {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao || '',
      estoque_fisico: produto.estoque_fisico || 0,
      estoque_site: produto.estoque_site || 0,
      preco: parseFloat(produto.preco || 0),
      preco_compra: parseFloat(produto.preco_compra || 0),
      fornecedor: produto.fornecedor_id ? {
        id: produto.fornecedor_id,
        nome: produto.fornecedor_nome || '',
        cidade: produto.fornecedor_cidade || '',
        contato: produto.fornecedor_contato || ''
      } : null,
      afiliado_estoque: estoqueAfiliados.rows.map(ae => ({
        afiliado_id: ae.afiliado_id,
        afiliado_nome: ae.afiliado_nome,
        quantidade: ae.quantidade
      })),
      fotos: fotosResult.rows.map(row => row.url_foto),
      created_at: produto.created_at,
      updated_at: produto.updated_at
    };

    console.log('✅ Produto encontrado:', produtoCompleto.nome);
    res.json(produtoCompleto);
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Criar novo produto
const createProduto = async (req, res) => {
  try {
    const {
      id,
      nome,
      descricao,
      estoque_fisico,
      estoque_site,
      preco,
      preco_compra,
      fornecedor_id
    } = req.body;

    console.log('📦 Criando produto:', { id, nome, fornecedor_id });

    // Validações
    if (!id || !nome) {
      return res.status(400).json({ error: 'ID e nome são obrigatórios' });
    }

    if (fornecedor_id) {
      // Verificar se fornecedor existe
      const fornecedorExists = await pool.query(
        'SELECT id FROM fornecedores WHERE id = $1',
        [fornecedor_id]
      );
      
      if (fornecedorExists.rows.length === 0) {
        return res.status(400).json({ error: 'Fornecedor não encontrado' });
      }
    }

    const result = await pool.query(`
      INSERT INTO produtos (
        id, nome, descricao, estoque_fisico, estoque_site, 
        preco, preco_compra, fornecedor_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      id, 
      nome, 
      descricao || '', 
      estoque_fisico || 0, 
      estoque_site || 0, 
      preco || 0, 
      preco_compra || 0, 
      fornecedor_id
    ]);

    console.log('✅ Produto criado:', result.rows[0].nome);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao criar produto:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Produto com este ID já existe' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar produto
const updateProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      estoque_fisico,
      estoque_site,
      preco,
      preco_compra,
      fornecedor_id
    } = req.body;

    console.log('📦 Atualizando produto:', id);

    // Validações
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    if (fornecedor_id) {
      // Verificar se fornecedor existe
      const fornecedorExists = await pool.query(
        'SELECT id FROM fornecedores WHERE id = $1',
        [fornecedor_id]
      );
      
      if (fornecedorExists.rows.length === 0) {
        return res.status(400).json({ error: 'Fornecedor não encontrado' });
      }
    }

    const result = await pool.query(`
      UPDATE produtos 
      SET 
        nome = $1, 
        descricao = $2, 
        estoque_fisico = $3, 
        estoque_site = $4,
        preco = $5, 
        preco_compra = $6, 
        fornecedor_id = $7, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      nome, 
      descricao || '', 
      estoque_fisico || 0, 
      estoque_site || 0, 
      preco || 0, 
      preco_compra || 0, 
      fornecedor_id, 
      id
    ]);

    if (result.rows.length === 0) {
      console.log('❌ Produto não encontrado para atualização:', id);
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    console.log('✅ Produto atualizado:', result.rows[0].nome);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Deletar produto
const deleteProduto = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    console.log('📦 Deletando produto:', id);

    // Verificar se produto existe
    const produtoExists = await client.query('SELECT id FROM produtos WHERE id = $1', [id]);
    
    if (produtoExists.rows.length === 0) {
      console.log('❌ Produto não encontrado para deleção:', id);
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar se produto existe em vendas (usando nome correto da tabela)
    const vendasCheck = await client.query(
      'SELECT COUNT(*) FROM venda_itens WHERE produto_id = $1',
      [id]
    );

    if (parseInt(vendasCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar produto com vendas vinculadas' 
      });
    }

    // Verificar se produto existe em kits
    const kitsCheck = await client.query(
      'SELECT COUNT(*) FROM kit_produtos WHERE produto_id = $1',
      [id]
    );

    if (parseInt(kitsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar produto vinculado a kits' 
      });
    }

    // Verificar se produto existe em conjuntos
    const conjuntosCheck = await client.query(
      'SELECT COUNT(*) FROM conjunto_produtos WHERE produto_id = $1',
      [id]
    );

    if (parseInt(conjuntosCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar produto vinculado a conjuntos' 
      });
    }

    // Deletar estoque de afiliados primeiro
    await client.query('DELETE FROM afiliado_estoque WHERE produto_id = $1', [id]);

    // Deletar fotos do produto
    await client.query('DELETE FROM produto_fotos WHERE produto_id = $1', [id]);

    // Deletar produto
    const result = await client.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [id]);

    await client.query('COMMIT');
    
    console.log('✅ Produto deletado:', result.rows[0].nome);
    res.json({ message: 'Produto deletado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao deletar produto:', error);
    res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllProdutos,
  getProdutoById,
  createProduto,
  updateProduto,
  deleteProduto
};
