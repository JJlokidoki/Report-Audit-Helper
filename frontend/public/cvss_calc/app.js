// Copyright FIRST, Red Hat, and contributors
// SPDX-License-Identifier: BSD-2-Clause

const app = Vue.createApp({
    data() {
        const params = new URLSearchParams(window.location.search);
        return {
            cvssConfigData: null,
            vectorInstance: new Vector(),
            cvssInstance: null,
            lang: params.get('lang') === 'ru' ? 'ru' : 'en',
        };
    },
    methods: {
        async loadConfigData() {
            const file = this.lang === 'ru'
                ? '/cvss_calc/metrics_ru.json'
                : '/cvss_calc/metrics.json';
            try {
                const response = await fetch(file);
                this.cvssConfigData = await response.json();
            } catch (error) {
                console.error("Failed to load metrics:", error);
            }
        },
        async toggleLang() {
            this.lang = this.lang === 'en' ? 'ru' : 'en';
            await this.loadConfigData();
        },
        onButton(metric, value) {
            this.vectorInstance.updateMetric(metric, value);
            window.location.hash = this.vector;
            this.updateCVSSInstance();
            this.notifyParent();
        },
        setButtonsToVector(vector) {
            try {
                this.vectorInstance.updateMetricsFromVectorString(vector);
                this.updateCVSSInstance();
            } catch (error) {
                console.error("Error updating vector:", error.message);
            }
        },
        updateCVSSInstance() {
            this.cvssInstance = new CVSS40(this.vectorInstance);
        },
        onReset() {
            window.location.hash = "";
            this.vectorInstance = new Vector();
            this.updateCVSSInstance();
            this.notifyParent();
        },
        notifyParent() {
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'cvss_update',
                    vector: this.vector,
                    score: this.score,
                    severity: this.severityRating,
                }, '*');
            }
        },
    },
    computed: {
        vector() { return this.vectorInstance.raw; },
        score() { return this.cvssInstance ? this.cvssInstance.score : 0; },
        severityRating() { return this.cvssInstance ? this.cvssInstance.severity : "None"; },
    },
    async beforeMount() {
        await this.loadConfigData();
        const hash = window.location.hash.slice(1);
        if (hash) this.setButtonsToVector(hash);
        this.notifyParent();
    },
    mounted() {
        window.addEventListener("hashchange", () => {
            this.setButtonsToVector(window.location.hash.slice(1));
        });
    },
});

app.mount("#app");
