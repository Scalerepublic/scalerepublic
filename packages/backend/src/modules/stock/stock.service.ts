const mockStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 210 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 330 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 420 },
]

export class StockService {
    getAll() {
        return mockStocks
    }
    calculateTotal(symbol: string, quantity: number, price: number) {
    return {
        symbol,
        quantity,
        price,
        total: quantity * price,
    }
}
}
