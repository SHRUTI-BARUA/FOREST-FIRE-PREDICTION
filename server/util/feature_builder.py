def build_features(data, region):
    if region == "ALGERIA":
        return [[
            data["temp"],
            data["rh"],
            data["wind"],
            data["rain"]
        ]]

    if region == "PORTUGAL":
        return [[
            data["FFMC"],
            data["DMC"],
            data["ISI"]
        ]]

    if region == "ODISHA":
        return [[
            data["ndvi"],
            data["temp"],
            data["wind"]
        ]]
