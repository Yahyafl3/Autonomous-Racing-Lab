
class NeuralNetwork {
    constructor(a, b, c, d) {
      // Si on passe un réseau de neurones en paramètre
      // on l'utilise
      // sinon on crée un réseau de neurones
      // avec les paramètres passés: nombre de neurones en entrée, cachés et sortie
      if (a instanceof tf.Sequential) {
        this.model = a;
        this.input_nodes = b;
        this.hidden_nodes = c;
        this.output_nodes = d;
      } else {
        this.input_nodes = a;
        this.hidden_nodes = b;
        this.output_nodes = c;
        this.model = this.createModel();
      }
    }
  
    // Crée une copie exacte et propre du réseau de neurones
    copy() {
      const modelCopy = this.createModel();
      const weights = this.model.getWeights();
      const weightCopies = [];
      for (let i = 0; i < weights.length; i++) {
        weightCopies[i] = weights[i].clone();
      }
      modelCopy.setWeights(weightCopies);
      for (let w of weightCopies) {
        w.dispose();
      }
      return new NeuralNetwork(modelCopy, this.input_nodes, this.hidden_nodes, this.output_nodes);
    }

    // Croisement génétique (Crossover) entre deux parents performants
    crossover(partner) {
      const parentAWeights = this.model.getWeights();
      const parentBWeights = partner ? partner.model.getWeights() : parentAWeights;
      const childWeights = [];

      for (let i = 0; i < parentAWeights.length; i++) {
        const tensorA = parentAWeights[i];
        const tensorB = parentBWeights[i];
        const shape = tensorA.shape;
        const valuesA = tensorA.dataSync();
        const valuesB = tensorB.dataSync();
        const childValues = new Float32Array(valuesA.length);

        // Point de scission pour le croisement des poids
        const split = Math.floor(Math.random() * valuesA.length);
        for (let j = 0; j < valuesA.length; j++) {
          childValues[j] = (j < split) ? valuesA[j] : valuesB[j];
        }

        childWeights[i] = tf.tensor(childValues, shape);
      }

      const childModel = this.createModel();
      childModel.setWeights(childWeights);
      for (let w of childWeights) {
        w.dispose();
      }
      return new NeuralNetwork(childModel, this.input_nodes, this.hidden_nodes, this.output_nodes);
    }

    // Mutation gaussienne des poids synaptiques avec nettoyage immédiat des tenseurs temporaires
    mutate(rate) {
      const weights = this.model.getWeights();
      const mutatedWeights = [];

      for (let i = 0; i < weights.length; i++) {
        const tensor = weights[i];
        const shape = tensor.shape;
        const values = tensor.dataSync().slice();

        for (let j = 0; j < values.length; j++) {
          if (Math.random() < rate) {
            const noise = (typeof randomGaussian === 'function')
              ? randomGaussian() * 0.5
              : (Math.random() * 2 - 1) * 0.5;
            values[j] += noise;
          }
        }

        mutatedWeights[i] = tf.tensor(values, shape);
      }

      this.model.setWeights(mutatedWeights);
      for (let w of mutatedWeights) {
        w.dispose();
      }
    }
  
    dispose() {
      try {
        if (this.model) {
          if (!this.model.optimizer) {
            this.model.optimizer = { dispose: () => {} };
          }
          this.model.dispose();
        }
      } catch (e) {
        try {
          if (this.model && typeof this.model.getWeights === 'function') {
            const weights = this.model.getWeights();
            for (const w of weights) {
              if (w && typeof w.dispose === 'function') w.dispose();
            }
          }
        } catch (err) {}
      }
    }
  
    // On prédit la sortie en fonction de l'entrée
    predict(inputs) {
      return tf.tidy(() => {
        // On convertit l'entrée en tenseur
        // et on prédit la sortie
        const xs = tf.tensor2d([inputs]);
        const ys = this.model.predict(xs);

        // On récupère les valeurs de la sortie
        const outputs = ys.dataSync();
        return outputs;
      });
    }
  
    createModel() {
      // On crée un réseau de neurones
      // avec une couche d'entrée, une couche cachée et une couche de sortie
      const model = tf.sequential();

      // couche d'activation classique de type sigmoide
      const hidden = tf.layers.dense({
        units: this.hidden_nodes,
        inputShape: [this.input_nodes],
        activation: 'sigmoid'
      });

      model.add(hidden);

      const output = tf.layers.dense({
        units: this.output_nodes,
        activation: 'sigmoid'
      });
      model.add(output);

      if (typeof model.compile === 'function') {
        try {
          model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
        } catch (e) {}
      }

      return model;
    }
  }