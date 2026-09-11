import { Model } from "@vuex-orm/core";

export class SingletonModel extends Model {
  static SINGLETON = "1";

  static getInstance() {
    const result = this.query()
      .where((x) => x.id === this.SINGLETON)
      .get();
    return result.length ? result[0] : null;
  }

  static setupInstance() {
    let instance = this.getInstance();
    if (!instance) {
      instance = this.create({
        data: { id: this.SINGLETON },
      });
    }
    return instance;
  }

  static resetInstance() {
    this.clearInstance();
    return this.setupInstance();
  }

  static clearInstance() {
    return this.delete((x) => x.id === this.SINGLETON);
  }

  static updateInstance(data) {
    const where = (x) => x.id === this.SINGLETON;
    const instance = this.getInstance();
    for (const [key, value] of Object.entries(data)) {
      instance[key] = value;
    }
    return this.update({ where, data });
  }
}
