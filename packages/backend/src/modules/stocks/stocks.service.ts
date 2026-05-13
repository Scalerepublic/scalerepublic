export class StocksService {
    private stocks = [
        { id: '1', symbol: 'AAPL', name: 'Apple Inc.', price: 189.5 },
        { id: '2', symbol: 'TSLA', name: 'Tesla Inc.', price: 245.0 },
        { id: '3', symbol: 'GOOGL', name: 'Alphabet Inc.', price: 175.3 },
    ]

    async getById(id: string) {
        return this.stocks.find(s => s.id === id) ?? null
    }

    async create(symbol: string, name: string, price: number) {
        const newStock = {
            id: String(this.stocks.length + 1),
            symbol,
            name,
            price,
        }
        this.stocks.push(newStock)
        return newStock
    }
    async calculateBulkPrice(id: string, quantity: number) {
        const stock = await this.getById(id)
        if (!stock) return null
        return {
            stock,
            quantity,
            totalPrice: stock.price * quantity,
        }
    }
}