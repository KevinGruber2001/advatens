package config

import "github.com/spf13/viper"

type EnvVars struct {
	AUTH0_DOMAIN    string `mapstructure:"AUTH0_DOMAIN"`
	AUTH0_AUDIENCE  string `mapstructure:"AUTH0_AUDIENCE"`
	INFLUXDB_URL    string `mapstructure:"INFLUXDB_URL"`
	INFLUXDB_TOKEN  string `mapstructure:"INFLUXDB_TOKEN"`
	INFLUXDB_ORG    string `mapstructure:"INFLUXDB_ORG"`
	INFLUXDB_BUCKET string `mapstructure:"INFLUXDB_BUCKET"`

	DB_USERNAME string `mapstructure:"DB_USERNAME"`
	DB_PASSWORD string `mapstructure:"DB_PASSWORD"`
	DB_HOST     string `mapstructure:"DB_HOST"`
	DB_PORT     string `mapstructure:"DB_PORT"`
	DB_DATABASE string `mapstructure:"DB_DATABASE"`
	DB_SCHEMA   string `mapstructure:"DB_SCHEMA"`
}

func LoadConfig() (config EnvVars, err error) {
	viper.AddConfigPath(".")
	viper.SetConfigName("app")
	viper.SetConfigType("env")

	viper.AutomaticEnv()

	err = viper.ReadInConfig()
	if err != nil {
		return
	}

	err = viper.Unmarshal(&config)
	return
}
