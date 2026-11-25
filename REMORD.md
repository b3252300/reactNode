mongodb 使用服務
在全域的終端機執行
### 啟動
mac 在使用mongodb，要先啟動mongodb，輸入  
```
brew services start mongodb-community@8.0
```

### 暫停

```
brew services stop mongodb-community@8.0

```

### 檢查服務清單
```
brew services list

```
### 查詢目前的資料庫mongodb
在終端機輸入mongosh
```
mongosh
```
再輸入
```
show dbs 
```