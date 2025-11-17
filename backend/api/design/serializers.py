import msgspec


class DesignInput(msgspec.Struct):
    inputYamlFilename: str
    protocolName: str
    numDesigns: int
    budget: int
    pipelineName: str | None = None
    cifFileFilename: str | None = None
    operatingMode: str | None = None
    fastaFileFilename: str | None = None


class StructureBasedSpecInput(msgspec.Struct):
    bindersScaffoldCIF: str
    targetPDB: str