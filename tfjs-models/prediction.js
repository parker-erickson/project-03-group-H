const tf = require("@tensorflow/tfjs");
const ready = require("document-ready");

const buildCnn = function (data) {
    return new Promise(function (resolve, reject) {

        //Sequential layers
        const model = tf.sequential();

        //input layer
        model.add(tf.layers.inputLayer({
            inputShape: [7, 1],
        }));

        //convolutional layer
        model.add(tf.layers.conv1d({
            kernelSize: 2,
            filters: 128,
            strides: 1,
            use_bias: true,
            activation: 'relu',
            kernelInitializer: 'VarianceScaling'
        }));

        //Average Pooling Layer
        model.add(tf.layers.averagePooling1d({
            poolSize: [2],
            strides: [1]
        }));

        //second convolutional layer
        model.add(tf.layers.conv1d({
            kernelSize: 2,
            filters:64,
            strides: 1,
            use_bias: true,
            activation: 'relu',
            kernelInitializer: 'VarianceScaling'
        }));

        //second pooling layer
        model.add(tf.layers.averagePooling1d({
            poolSize: [2],
            strides: [1]
        }));

        //Flatten layer
        model.add(tf.layers.flatten({

        }));

        //Dense layer
        model.add(tf.layers.dense({
            units: 1,
            kernelInitializer: 'VarianceScaling',
            activation: 'liner'
        }));

        return resolve({
            'model': model,
            'data': data
        });
    });
}

const cnn = function(model, data, epochs) {
    console.log("MODEL SUMMARY: ")
    model.summary();

    return new Promise(function (resolve, reject){
        try {
            //optimize using adam
            model.compile({ optimzer: 'adam', loss: 'meanSquaredError' });

            //model training
            model.fit(data.tensorTrainX, data.tensorTrainY, {
                epochs: epochs
            }).then((result) => {
                print("Loss after last Epoch (" + result.epoch.length + ") is: " + result.history.loss[result.epoch.length-1]);
                resolve(model);
            })
        }
        catch (ex) {
            reject(ex);
        }
    });
}

const key = 'RNQAGUEKH5UL8IF5';
const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=%symbol%&outputsize=full&apikey=${key}`;
let epochs = 100;
let timePortion = 7;

ready(function () {

    console.log("DOM is ready!");

    //initialize the graph
    plotData([], []);

    //pass the symbol from the html
    $('#getSymbol').click(funciton() {
        clearPrint();
        print("Beginning Stock Prediction ...");
        let company = $('company').val().trim();

    })

})




